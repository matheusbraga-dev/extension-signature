/**
 * Suporte ao Cervello (cervelloesm.com.br): injeta um botão flutuante fixo no
 * canto inferior direito que abre o menu de perfis e insere a assinatura no
 * campo atualmente focado (editor rico ou textarea).
 *
 * A visibilidade do botão é controlada pela preferência `showFloatingButton`
 * (configurável em Configurações → Avançado e Backup).
 *
 * Requer: constants, sanitize, normalizer, storage, logger, domUtils e
 * content/index.js (cachedState e insertSignature), carregados antes via
 * content_scripts/scripting.
 */

const CV_FAB_ID = 'M-cervello-fab';
const CV_MENU_ID = 'M-cervello-menu';

function isCervello() {
    return /(^|\.)cervelloesm\.com\.br$/i.test(location.hostname);
}

// Tenta o paste sintético (padrão) e, se o editor não mudar de conteúdo,
// reaplica com execCommand('insertHTML'), cobrindo editores que ignoram
// eventos de paste sintéticos (como o Gmail).
function insertSignatureRobust(editor, isContentEditable, profileIndex, currentState) {
    cachedState = currentState;
    editor.focus();

    if (!isContentEditable) {
        insertSignature(editor, false, profileIndex);
        return;
    }

    const before = editor.innerHTML;
    insertSignature(editor, true, profileIndex, false);

    setTimeout(() => {
        if (editor.innerHTML === before) {
            insertSignature(editor, true, profileIndex, true);
        }
    }, 150);
}

function resolveTargetEditor() {
    const focused = findActiveEditorTarget();
    if (focused) return focused;
    const editors = document.querySelectorAll('[contenteditable="true"], textarea, input[type="text"]');
    return editors.length > 0
        ? { targetElement: editors[editors.length - 1], isContentEditable: editors[editors.length - 1].isContentEditable || editors[editors.length - 1].tagName !== 'TEXTAREA' }
        : null;
}

function buildProfileMenu(btn) {
    const menu = document.createElement('div');
    menu.id = CV_MENU_ID;
    menu.style.cssText = `
        display: none; position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: #FFFFFF; border: 1px solid #DFE1E6; border-radius: 8px;
        box-shadow: 0 12px 32px rgba(9, 30, 66, 0.25);
        padding: 6px 0; z-index: 2147483647;
        min-width: 260px; max-width: 90vw; max-height: 80vh; overflow-y: auto;
    `;
    document.body.appendChild(menu);

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        document.querySelectorAll(`#${CV_MENU_ID}`).forEach((m) => {
            if (m !== menu) m.style.display = 'none';
        });

        if (menu.style.display === 'block') {
            menu.style.display = 'none';
            return;
        }

        menu.innerHTML = '';
        menu.style.display = 'block';

        const header = document.createElement('div');
        header.textContent = 'INSERIR ASSINATURA';
        header.style.cssText = 'font-size: 11px; font-weight: 700; color: #6B778C; padding: 6px 12px 2px; margin-bottom: 4px; border-bottom: 1px solid #EBECF0;';
        menu.appendChild(header);

        const loading = document.createElement('div');
        loading.textContent = 'Carregando perfis...';
        loading.style.cssText = 'padding: 8px 12px; font-size: 12px; color: #6B778C;';
        menu.appendChild(loading);

        loadStateFromStorage((currentState) => {
            loading.remove();
            const profiles = currentState.profiles || [];

            if (profiles.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = 'Nenhum perfil configurado.';
                empty.style.cssText = 'padding: 8px 12px; font-size: 12px; color: #DE350B;';
                menu.appendChild(empty);
                return;
            }

            profiles.forEach((profile, index) => {
                const item = document.createElement('div');
                item.textContent = profile.name;
                item.style.cssText = `
                    padding: 8px 12px; cursor: pointer; font-size: 13px;
                    color: #172B4D; font-family: -apple-system, sans-serif;
                    transition: background 0.1s; display: block; white-space: nowrap;
                    overflow: hidden; text-overflow: ellipsis;
                `;
                item.onmouseover = () => item.style.background = '#F4F5F7';
                item.onmouseout = () => item.style.background = 'transparent';

                item.addEventListener('mousedown', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    menu.style.display = 'none';

                    const target = resolveTargetEditor();
                    if (target) {
                        insertSignatureRobust(target.targetElement, target.isContentEditable, index, currentState);
                    } else {
                        showToast('Selecione primeiro um campo de texto editável.');
                    }
                });

                menu.appendChild(item);
            });
        });
    });

    // Fecha o menu clicando fora
    document.addEventListener('mousedown', (e) => {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = 'none';
        }
    });

    return menu;
}

function syncFabVisibility(fab) {
    const show = cachedState ? cachedState.showFloatingButton !== false : true;
    fab.style.display = show ? 'flex' : 'none';
}

function injectFloatingButton() {
    if (!isCervello()) return;
    if (document.getElementById(CV_FAB_ID)) return;

    const fab = document.createElement('button');
    fab.id = CV_FAB_ID;
    fab.title = 'M - Inserir Assinatura';
    fab.setAttribute('aria-label', 'Inserir Assinatura');
    fab.innerHTML = M_ICON_SVG;
    fab.style.cssText = `
        position: fixed; right: 24px; bottom: 24px; z-index: 2147483647;
        width: 52px; height: 52px; border-radius: 50%; border: none; cursor: pointer;
        background: #0A3A5C; color: #FFFFFF; display: flex; align-items: center;
        justify-content: center; box-shadow: 0 8px 24px rgba(9, 30, 66, 0.35);
        transition: transform 0.15s, box-shadow 0.15s;
    `;
    fab.onmouseover = () => { fab.style.transform = 'scale(1.08)'; fab.style.boxShadow = '0 10px 28px rgba(9, 30, 66, 0.45)'; };
    fab.onmouseout = () => { fab.style.transform = 'scale(1)'; fab.style.boxShadow = '0 8px 24px rgba(9, 30, 66, 0.35)'; };

    buildProfileMenu(fab);
    document.body.appendChild(fab);

    syncFabVisibility(fab);

    // A preferência pode mudar enquanto a página está aberta.
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes[STORAGE_KEY]) {
            cachedState = normalizeState(changes[STORAGE_KEY].newValue);
            syncFabVisibility(fab);
        }
    });
}

if (isCervello()) {
    injectFloatingButton();

    // Garantia: o body pode não estar disponível se a injeção rodar cedo demais.
    setTimeout(() => {
        if (!document.getElementById(CV_FAB_ID)) injectFloatingButton();
    }, 1000);
}