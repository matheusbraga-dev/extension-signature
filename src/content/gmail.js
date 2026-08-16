/**
 * Suporte nativo ao Gmail: injeta um botão na toolbar de composição de
 * e-mail e insere a assinatura no corpo da mensagem (contenteditable).
 *
 * Os seletores do Gmail são obfuscados e mudam a cada deploy. Portanto, usa-se
 * um sistema em camadas: primeiro atributos estáveis (role, g_editable,
 * aria-label) e, como fallback, classes conhecidas.
 *
 * Requer: constants, sanitize, normalizer, storage, logger, domUtils e
 * content/index.js (cachedState e insertSignature), carregados antes via
 * content_scripts/scripting.
 */

const GM_BTN_ID = 'M-gmail-toolbar-btn';
const GM_MENU_ID = 'M-gmail-menu';

// Seletores do corpo da composição, do mais estável ao mais frágil.
const GM_EDITOR_SELECTORS = [
    'div[role="textbox"][g_editable="true"]',
    'div[contenteditable="true"][g_editable="true"]',
    '.Am.Al.editable',
    'div[aria-label="Message Body"][contenteditable="true"]',
    'div[aria-label="Body"][contenteditable="true"]'
];

// Seletores da barra de formatação da composição.
const GM_TOOLBAR_SELECTORS = [
    'tr.btC td.gU',
    '.btC .gU',
    'td.gU',
    '.gU',
    '[role="toolbar"]'
];

function isGmail() {
    return location.hostname === 'mail.google.com';
}

function queryTiered(root, selectors) {
    for (const selector of selectors) {
        const el = root.querySelector(selector);
        if (el) return el;
    }
    return null;
}

function findGmailEditors() {
    const seen = new Set();
    const editors = [];
    for (const selector of GM_EDITOR_SELECTORS) {
        document.querySelectorAll(selector).forEach((el) => {
            if (!seen.has(el)) {
                seen.add(el);
                editors.push(el);
            }
        });
    }
    return editors;
}

function findGmailToolbar(editor) {
    // Sobe a cadeia de ancestrais até o container da janela de composição,
    // onde a barra de formatação é um descendente.
    let node = editor;
    for (let i = 0; i < 15 && node; i++) {
        const toolbar = queryTiered(node, GM_TOOLBAR_SELECTORS);
        if (toolbar) return toolbar;
        node = node.parentElement;
    }
    return null;
}

function findEditorForToolbar(toolbar) {
    let node = toolbar;
    for (let i = 0; i < 15 && node; i++) {
        const editor = queryTiered(node, GM_EDITOR_SELECTORS);
        if (editor) return editor;
        node = node.parentElement;
    }
    return null;
}

function injectGmailButton(toolbar) {
    // Evita duplicatas na mesma barra
    if (toolbar.querySelector(`#${GM_BTN_ID}`)) return;

    const container = document.createElement('div');
    container.id = GM_BTN_ID;
    container.style.cssText = 'display:inline-flex;align-items:center;position:relative;margin-left:4px;';

    const btn = document.createElement('button');
    btn.innerHTML = M_ICON_SVG;
    btn.title = 'Inserir Assinatura';
    btn.setAttribute('aria-label', 'Inserir Assinatura');
    btn.style.cssText = `
        background: transparent; border: none; cursor: pointer; padding: 0 6px;
        color: #5F6368; display: flex; align-items: center; justify-content: center;
        height: 26px; border-radius: 3px; transition: background 0.1s;
    `;
    btn.onmouseover = () => { btn.style.background = 'rgba(32, 33, 36, 0.08)'; };
    btn.onmouseout = () => { btn.style.background = 'transparent'; };

    const menu = document.createElement('div');
    menu.id = GM_MENU_ID;
    menu.style.cssText = `
        display: none; position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: #FFFFFF; border: 1px solid #DADCE0; border-radius: 8px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25); padding: 6px 0;
        z-index: 2147483647; min-width: 240px; max-width: 90vw;
        max-height: 80vh; overflow-y: auto;
    `;

    // mousedown para interceptar o clique antes do Gmail (closure)
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        document.querySelectorAll(`#${GM_MENU_ID}`).forEach((m) => {
            if (m !== menu) m.style.display = 'none';
        });

        if (menu.style.display === 'block') {
            menu.style.display = 'none';
            return;
        }

        // Abre o menu imediatamente e popula a lista de forma assíncrona,
        // desacoplando a abertura de uma leitura de storage que poderia
        // falhar/demorar e impedir o menu de aparecer.
        menu.innerHTML = '';
        menu.style.display = 'block';

        const header = document.createElement('div');
        header.textContent = 'INSERIR ASSINATURA';
        header.style.cssText = 'font-size: 11px; font-weight: 700; color: #5F6368; padding: 6px 12px 2px; border-bottom: 1px solid #E8EAED; margin-bottom: 4px;';
        menu.appendChild(header);

        const loading = document.createElement('div');
        loading.textContent = 'Carregando perfis...';
        loading.style.cssText = 'padding: 8px 12px; font-size: 12px; color: #5F6368;';
        menu.appendChild(loading);

        loadStateFromStorage((currentState) => {
            loading.remove();
            const profiles = currentState.profiles || [];

            if (profiles.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = 'Nenhum perfil configurado.';
                empty.style.cssText = 'padding: 8px 12px; font-size: 12px; color: #D93025;';
                menu.appendChild(empty);
            } else {
                profiles.forEach((profile, index) => {
                    const item = document.createElement('div');
                    item.textContent = profile.name;
                    item.style.cssText = `
                        padding: 8px 12px; cursor: pointer; font-size: 13px;
                        color: #202124; transition: background 0.1s; display: block;
                        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    `;
                    item.onmouseover = () => item.style.background = '#F1F3F4';
                    item.onmouseout = () => item.style.background = 'transparent';

                    item.addEventListener('mousedown', (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        menu.style.display = 'none';

                        const editor = findEditorForToolbar(toolbar);
                        if (editor) {
                            // Atualiza o cache para a injeção usar os dados certos
                            cachedState = currentState;
                            // useExecCommand=true: o Gmail ignora paste sintético
                            insertSignature(editor, true, index, true);
                        } else {
                            showToast('Erro: Não foi possível localizar o editor do e-mail.');
                        }
                    });

                    menu.appendChild(item);
                });
            }
        });
    });

    // Fecha o menu clicando fora
    document.addEventListener('mousedown', (e) => {
        if (!container.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = 'none';
        }
    });

    container.appendChild(btn);
    document.body.appendChild(menu);
    toolbar.appendChild(container);
}

function scanForCompose() {
    if (!isGmail()) return;
    findGmailEditors().forEach((editor) => {
        const toolbar = findGmailToolbar(editor);
        if (toolbar) injectGmailButton(toolbar);
    });
}

const gmailObserver = new MutationObserver(() => {
    scanForCompose();
});

if (isGmail()) {
    gmailObserver.observe(document.body, { childList: true, subtree: true });

    // Garantia: injeta mesmo se a composição já estava aberta quando a página carregou
    setTimeout(scanForCompose, 1500);
    setTimeout(scanForCompose, 4000);
}