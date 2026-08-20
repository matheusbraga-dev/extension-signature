/**
 * Comandos de edição modernos para contenteditable/textarea.
 *
 * document.execCommand está deprecado (WHATWG). Estes helpers usam
 * Selection/Range/insertNode e mantêm execCommand apenas como fallback,
 * para continuar funcionando em hosts que dependem dele (ex.: Gmail).
 *
 * Requer: nada (puro DOM).
 */

function getEditorDoc(element) {
    return (element && element.ownerDocument) || document;
}

// Insere HTML no ponto de inserção de um elemento contenteditable.
function insertHtmlAtCursor(element, html) {
    if (!element) return false;
    const doc = getEditorDoc(element);
    element.focus();

    const selection = doc.getSelection();
    if (selection && selection.rangeCount > 0 && selection.anchorNode) {
        try {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const fragment = range.createContextualFragment(String(html));
            const lastNode = fragment.lastChild;
            range.insertNode(fragment);

            if (lastNode) {
                const caret = doc.createRange();
                caret.setStartAfter(lastNode);
                caret.collapse(true);
                selection.removeAllRanges();
                selection.addRange(caret);
            }

            element.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
        } catch (_err) {
            // cai no fallback abaixo
        }
    }

    if (doc.execCommand) {
        doc.execCommand('insertHTML', false, String(html));
        return true;
    }
    return false;
}

// Insere texto puro no ponto de inserção de um elemento contenteditable.
function insertTextAtCursor(element, text) {
    if (!element) return false;
    const doc = getEditorDoc(element);
    element.focus();

    const selection = doc.getSelection();
    if (selection && selection.rangeCount > 0 && selection.anchorNode) {
        try {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = doc.createTextNode(String(text));
            range.insertNode(textNode);

            const caret = doc.createRange();
            caret.setStartAfter(textNode);
            caret.collapse(true);
            selection.removeAllRanges();
            selection.addRange(caret);

            element.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
        } catch (_err) {
            // cai no fallback abaixo
        }
    }

    if (doc.execCommand) {
        doc.execCommand('insertText', false, String(text));
        return true;
    }
    return false;
}

// Envolve a seleção de um contenteditable com um link. Fallback via execCommand.
function createLinkAtCursor(element, url) {
    if (!element) return false;
    const doc = getEditorDoc(element);
    element.focus();

    const selection = doc.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        try {
            const range = selection.getRangeAt(0);
            const anchor = doc.createElement('a');
            anchor.href = String(url);
            try {
                anchor.appendChild(range.extractContents());
            } catch (_err) {
                anchor.appendChild(doc.createTextNode(String(url)));
            }
            range.insertNode(anchor);

            const caret = doc.createRange();
            caret.setStartAfter(anchor);
            caret.collapse(true);
            selection.removeAllRanges();
            selection.addRange(caret);

            element.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
        } catch (_err) {
            // cai no fallback abaixo
        }
    }

    if (doc.execCommand) {
        doc.execCommand('createLink', false, String(url));
        return true;
    }
    return false;
}