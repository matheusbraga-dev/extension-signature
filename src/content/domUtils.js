/**
 * Utilitários de DOM e interação com o editor do Jira.
 * Requer: constants.
 */

function showToast(message) {
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
        background: '#201B18',
        color: '#F2ECE3',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        fontSize: '13px',
        lineHeight: '1.4',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,.25)',
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