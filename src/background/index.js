/**
 * Service Worker da extensão (ponto de entrada).
 * Carrega os módulos compartilhados e o gerenciador de menu de contexto.
 */
importScripts(
    '../shared/constants.js',
    '../shared/utils/normalizer.js',
    '../shared/utils/logger.js',
    '../shared/api/storage.js',
    'contextMenu.js'
);

const CONTENT_SCRIPTS = [
    'src/shared/constants.js',
    'src/shared/utils/sanitize.js',
    'src/shared/utils/normalizer.js',
    'src/shared/utils/logger.js',
    'src/shared/utils/editorCommands.js',
    'src/shared/api/storage.js',
    'src/content/index.js',
    'src/content/domUtils.js',
    'src/content/profileMenu.js',
    'src/content/injector.js',
    'src/content/observer.js',
    'src/content/gmail.js',
    'src/content/cervello.js',
    'src/content/in-context-onboarding.js'
];

async function ensureStorageMigration() {
    const syncState = await getSyncState();
    if (syncState) return;

    const legacyHtml = await getLegacyState();
    if (legacyHtml) {
        await writeSyncState({
            activeProfileId: 'default',
            profiles: [{ id: 'default', name: 'Padrão', html: legacyHtml }]
        });
        await removeLegacyState();
        return;
    }

    await writeSyncState(createDefaultState());
}

function getTabById(tabId) {
    return new Promise((resolve) => {
        chrome.tabs.get(tabId, (tab) => {
            resolve(chrome.runtime.lastError ? null : tab);
        });
    });
}

async function getEffectiveAllowedSites() {
    const state = await getStateFromSync();
    // Garante que os domínios padrão (declarados no manifest) sempre sejam
    // permitidos, mesmo que a lista gravada no storage esteja desatualizada
    // (ex.: usuários que instalaram antes de um novo domínio padrão).
    const merged = [...(state.allowedSites || []), ...DEFAULT_ALLOWED_SITES];
    return [...new Set(merged)];
}

async function isUrlAllowed(url) {
    if (!url) return false;
    const allowedSites = await getEffectiveAllowedSites();
    return isAllowedUrl(url, allowedSites);
}

async function injectContentScripts(tabId) {
    if (!tabId) return;

    const injected = await new Promise((resolve) => {
        chrome.scripting.executeScript(
            {
                target: { tabId },
                files: CONTENT_SCRIPTS
            },
            () => {
                resolve(!chrome.runtime.lastError);
            }
        );
    });

    return injected;
}

async function isContentInjected(tabId) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: M_PING_MESSAGE }, () => {
            resolve(!chrome.runtime.lastError);
        });
    });
}

async function ensureContentInjected(tabId, url) {
    if (!tabId || !(await isUrlAllowed(url))) return;
    // Evita injeção duplicada (onUpdated + onActivated podem disparar juntos).
    if (await isContentInjected(tabId)) return;
    await injectContentScripts(tabId);
}

async function dispatchInsert(tabId, profileIndex) {
    if (!tabId) return;

    const [state, tab] = await Promise.all([getStateFromSync(), getTabById(tabId)]);
    const allowedSites = [...(state.allowedSites || []), ...DEFAULT_ALLOWED_SITES];
    if (!tab || !isAllowedUrl(tab.url, allowedSites)) return;

    const payload = {
        type: M_INSERT_MESSAGE,
        profileIndex: Number.isInteger(profileIndex) ? profileIndex : null
    };

    const delivered = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, payload, () => {
            resolve(!chrome.runtime.lastError);
        });
    });

    if (delivered) return;

    const injected = await injectContentScripts(tabId);

    if (!injected) return;

    chrome.tabs.sendMessage(tabId, payload, () => {
        // Se falhar aqui, normalmente é porque a aba não permite script.
        // Não há ação adicional necessária neste fluxo.
    });
}

function getActiveTabId() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = Array.isArray(tabs) && tabs.length ? tabs[0] : null;
            resolve(activeTab ? activeTab.id : null);
        });
    });
}

async function activateExtension(tabId) {
    if (chrome.action && typeof chrome.action.openPopup === 'function') {
        const opened = await new Promise((resolve) => {
            chrome.action.openPopup(() => {
                resolve(!chrome.runtime.lastError);
            });
        });

        if (opened) return;
    }

    await dispatchInsert(tabId, null);
}

chrome.runtime.onInstalled.addListener(async () => {
    await ensureStorageMigration();
    ensureContextMenu();
});

chrome.runtime.onStartup.addListener(async () => {
    await ensureStorageMigration();
    ensureContextMenu();
});

chrome.commands.onCommand.addListener(async (command) => {
    const tabId = await getActiveTabId();

    if (command === 'activate-extension') {
        activateExtension(tabId);
        return;
    }

    if (command === 'insert-signature') {
        dispatchInsert(tabId, null);
        return;
    }

    if (command === 'insert-profile-1') {
        dispatchInsert(tabId, 0);
        return;
    }

    if (command === 'insert-profile-2') {
        dispatchInsert(tabId, 1);
        return;
    }

    // Macros Alt+3 ... Alt+9 → perfis 3 ... 9
    const profileMacroMatch = command.match(/^insert-profile-(\d+)$/);
    if (profileMacroMatch) {
        const index = parseInt(profileMacroMatch[1], 10) - 1;
        dispatchInsert(tabId, index);
        return;
    }
});

// Injeta o content script assim que a aba navegar para um site permitido,
// fazendo o botão da toolbar do Jira aparecer sem grants amplos de host.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        ensureContentInjected(tabId, tab.url);
    }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await getTabById(activeInfo.tabId);
    if (tab && tab.url) {
        ensureContentInjected(tab.id, tab.url);
    }
});