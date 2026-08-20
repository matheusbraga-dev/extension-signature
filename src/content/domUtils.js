/**
 * Utilitários de DOM e interação com o editor do Jira.
 * Requer: constants.
 */

// Estilos compartilhados dos elementos injetados (toast, menu, preview, FAB).
// Usa CSS variables com suporte a prefers-color-scheme: dark, para que a UI
// injetada acompanhe o tema do site hospedeiro.
const M_SHARED_STYLE_ID = 'M-shared-style';

function getThemeCSS() {
    return `
#${M_SHARED_STYLE_ID} {
    --m-bg: #FFFFFF;
    --m-bg-soft: #F4F5F7;
    --m-border: #DFE1E6;
    --m-border-soft: #EBECF0;
    --m-text: #172B4D;
    --m-text-soft: #6B778C;
    --m-danger: #DE350B;
    --m-shadow: 0 12px 32px rgba(9, 30, 66, 0.25);
}
@media (prefers-color-scheme: dark) {
    #${M_SHARED_STYLE_ID} {
        --m-bg: #1F2430;
        --m-bg-soft: #2A303D;
        --m-border: #3A4356;
        --m-border-soft: #323B4B;
        --m-text: #E4E9F2;
        --m-text-soft: #9AA6B8;
        --m-danger: #FF8F73;
        --m-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
    }
}
.M-sig-menu, .M-sig-preview, .M-sig-fab, #M-signature-toast {
    background: var(--m-bg);
    color: var(--m-text);
    border-color: var(--m-border);
    box-shadow: var(--m-shadow);
}
.M-sig-menu { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); border-radius: 8px; border: 1px solid var(--m-border); padding: 6px 0; z-index: 2147483647; min-width: 260px; max-width: 90vw; max-height: 80vh; overflow-y: auto; }
.M-sig-preview { position: fixed; z-index: 2147483646; pointer-events: none; border-radius: 8px; border: 1px solid var(--m-border); padding: 12px 14px; max-width: 320px; max-height: 240px; overflow-y: auto; font-size: 13px; line-height: 1.45; }
.M-sig-menu-head { font-size: 11px; font-weight: 700; color: var(--m-text-soft); padding: 6px 12px 2px; margin-bottom: 4px; border-bottom: 1px solid var(--m-border-soft); }
.M-sig-menu-item { padding: 8px 12px; cursor: pointer; font-size: 13px; color: var(--m-text); font-family: -apple-system, sans-serif; transition: background 0.1s; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.M-sig-menu-item:hover { background: var(--m-bg-soft); }
.M-sig-menu-empty { padding: 8px 12px; font-size: 12px; color: var(--m-danger); }
.M-sig-menu-search { width: 100%; box-sizing: border-box; border: none; border-bottom: 1px solid var(--m-border-soft); background: transparent; color: var(--m-text); font-size: 13px; padding: 6px 12px; outline: none; margin-bottom: 4px; }
.M-sig-menu-search::placeholder { color: var(--m-text-soft); }
.M-sig-menu-item.is-empty-note { color: var(--m-text-soft); cursor: default; }
`;
}

// Injeta o stylesheet compartilhado uma única vez por página.
function injectSharedStyles() {
    if (document.getElementById(M_SHARED_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = M_SHARED_STYLE_ID;
    style.textContent = getThemeCSS();
    (document.head || document.documentElement).appendChild(style);
}

function showToast(message) {
    injectSharedStyles();
    const existing = document.getElementById('M-signature-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'M-signature-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;

    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        maxWidth: '280px',
        padding: '10px 14px',
        border: '1px solid var(--m-border)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        fontSize: '13px',
        lineHeight: '1.4',
        borderRadius: '8px',
        zIndex: 2147483647,
        opacity: '0',
        transition: 'opacity .2s ease',
        pointerEvents: 'none'
    });

    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 250);
    }, 2800);
}

function htmlToPlainText(html) {
    return html.replace(/<br\s*[\/]?>/gi, '\n').replace(/<[^>]+>/g, '');
}

function findActiveEditorTarget() {
    const activeElement = document.activeElement;
    if (!activeElement) return null;

    const richTextEditor = activeElement.closest ? activeElement.closest('[contenteditable="true"]') : null;
    const isContentEditable = activeElement.isContentEditable || richTextEditor !== null;
    const isTextArea = activeElement.tagName === 'TEXTAREA';
    const isTextInput = activeElement.tagName === 'INPUT' && /^(text|search|url|email|tel)$/i.test(activeElement.type || 'text');

    if (!isTextArea && !isContentEditable && !isTextInput) return null;

    return { targetElement: richTextEditor || activeElement, isContentEditable };
}

function findEditorFromToolbar(toolbar) {
    // Sobe a cadeia de ancestrais em busca de um wrapper que contenha o editor.
    let node = toolbar;
    for (let i = 0; i < 6 && node; i++) {
        const editor = node.querySelector('[contenteditable="true"]');
        if (editor) return editor;
        node = node.parentElement;
    }

    // Fallback: último editor contenteditable da página.
    const editors = document.querySelectorAll('[contenteditable="true"]');
    return editors.length > 0 ? editors[editors.length - 1] : null;
}