/**
 * Ponto de entrada do content script: gerencia o cache de estado e a
 * injeção da assinatura no editor. Requer: constants, sanitize, normalizer,
 * storage, logger e domUtils (carregados antes via manifest/scripting).
 */

// Cache em memória para não consultar storage a cada comando.
let cachedState = null;
let cacheReady = false;

function refreshCache() {
    chrome.storage.sync.get([STORAGE_KEY], (syncResult) => {
        chrome.storage.local.get([LEGACY_KEY], (localResult) => {
            if (chrome.runtime.lastError) return;
            cachedState = stateFromStorage(syncResult, localResult[LEGACY_KEY]);
            cacheReady = true;
        });
    });
}
refreshCache();

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[STORAGE_KEY]) {
        cachedState = normalizeState(changes[STORAGE_KEY].newValue);
        cacheReady = true;
    }
});

function applyDynamicPlaceholders(html, placeholders) {
    let result = typeof html === 'string' ? html : '';
    const date = new Intl.DateTimeFormat('pt-BR').format(new Date());
    const map = { data: date };

    (Array.isArray(placeholders) ? placeholders : []).forEach((placeholder) => {
        if (placeholder && typeof placeholder.key === 'string' && placeholder.key.trim()) {
            map[placeholder.key.trim().toLowerCase()] = String(placeholder.value ?? '');
        }
    });

    for (const [key, value] of Object.entries(map)) {
        const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(`\\{\\{\\s*${safeKey}\\s*\\}\\}`, 'gi'), value);
    }

    return result;
}

function getProfileHtml(profileIndex) {
    if (!cachedState || !Array.isArray(cachedState.profiles) || !cachedState.profiles.length) return '';

    if (Number.isInteger(profileIndex) && profileIndex >= 0 && cachedState.profiles[profileIndex]) {
        return cachedState.profiles[profileIndex].html;
    }

    const active = cachedState.profiles.find((profile) => profile.id === cachedState.activeProfileId);
    return active ? active.html : cachedState.profiles[0].html;
}

function insertSignature(targetElement, isContentEditable, profileIndex, useExecCommand) {
    const selectedHtml = sanitizeSignatureHtml(getProfileHtml(profileIndex));
    const hydrated = applyDynamicPlaceholders(selectedHtml, cachedState ? cachedState.placeholders : undefined);

    if (!hydrated) {
        showToast('Assinatura não configurada. Abra o ícone da extensão para criar a sua.');
        return;
    }

    const signatureData = `<br><br>${hydrated}`;

    const index = Number.isInteger(profileIndex) ? profileIndex : 0;
    const profileName = cachedState && Array.isArray(cachedState.profiles) && cachedState.profiles[index]
        ? cachedState.profiles[index].name
        : 'Padrão';

    if (isContentEditable) {
        targetElement.focus();

        if (useExecCommand) {
            // O Gmail não responde a eventos de paste sintéticos. Usamos o
            // helper moderno (Selection/Range), que tem fallback interno para
            // execCommand onde o host depender dele.
            insertHtmlAtCursor(targetElement, signatureData);
        } else {
            const before = targetElement.innerHTML;

            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/html', signatureData);

            const plainText = htmlToPlainText(signatureData);
            dataTransfer.setData('text/plain', plainText);

            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData: dataTransfer,
                bubbles: true,
                cancelable: true
            });

            targetElement.dispatchEvent(pasteEvent);

            // Alguns editores (ex.: Cervello) ignoram paste sintético. Se o
            // conteúdo não mudou, tenta a inserção direta como fallback.
            setTimeout(() => {
                if (targetElement.innerHTML === before) {
                    insertHtmlAtCursor(targetElement, signatureData);
                }
            }, 150);
        }

        logAction(`Assinatura "${profileName}" injetada`);
    } else {
        const plainText = "\n\n" + htmlToPlainText(hydrated);
        const start = targetElement.selectionStart;
        const end = targetElement.selectionEnd;

        targetElement.value = targetElement.value.substring(0, start) + plainText + targetElement.value.substring(end);
        targetElement.selectionStart = targetElement.selectionEnd = start + plainText.length;

        targetElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function insertFromCurrentFocus(profileIndex) {
    const editorTarget = findActiveEditorTarget();
    if (!editorTarget) {
        showToast('Selecione primeiro um campo de texto editável.');
        return;
    }

    insertSignature(editorTarget.targetElement, editorTarget.isContentEditable, profileIndex);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message) return;

    // Ping: usado pelo background para detectar se o content script já está
    // injetado e evitar a injeção duplicada (que gera erros de re-declaração).
    if (message.type === M_PING_MESSAGE) {
        sendResponse({ ok: true });
        return;
    }

    if (message.type !== M_INSERT_MESSAGE) return;

    const profileIndex = Number.isInteger(message.profileIndex) ? message.profileIndex : null;

    if (cacheReady) {
        insertFromCurrentFocus(profileIndex);
        sendResponse({ ok: true });
        return;
    }

    chrome.storage.sync.get([STORAGE_KEY], (syncResult) => {
        chrome.storage.local.get([LEGACY_KEY], (localResult) => {
            cachedState = stateFromStorage(syncResult, localResult[LEGACY_KEY]);
            cacheReady = true;
            insertFromCurrentFocus(profileIndex);
            sendResponse({ ok: true });
        });
    });

    return true;
});