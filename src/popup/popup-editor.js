/**
 * Bindings do editor: alterações não salvas, colar com sanitização,
 * ferramentas de formatação (negrito/itálico/link) e menu de placeholders.
 * Requer: sanitize, popup-utils e popup-state (via script tags).
 */

window.MPopup = window.MPopup || {};

MPopup.initEditor = function () {
    const { editor, btnBold, btnItalic, btnLink, btnPlaceholder, placeholderMenu } = MPopup.refs;

    // ---------- Alterações não salvas ----------
    editor.addEventListener('input', () => {
        if (!MPopup.isExtension) return;
        MPopup.setDirty(editor.innerHTML !== MPopup.lastSaved);
    });

    // ---------- Colar com sanitização (corrige o bug do emoji gigante) ----------
    editor.addEventListener('paste', (e) => {
        e.preventDefault();
        const html = e.clipboardData.getData('text/html');

        let clean;
        if (html) {
            clean = sanitizeSignatureHtml(html);
        } else {
            const text = e.clipboardData.getData('text/plain');
            clean = text
                .split('\n')
                .map((line) => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
                .join('<br>');
        }

        document.execCommand('insertHTML', false, clean);
    });

    // ---------- Ferramentas de formatação ----------
    // preventDefault no mousedown mantém a seleção de texto dentro do
    // editor ao clicar nos botões (sem isso, o foco pode saltar para o
    // botão antes do clique, e o negrito/itálico/link deixam de aplicar
    // à seleção correta).
    [btnBold, btnItalic, btnLink].forEach((btn) => {
        btn.addEventListener('mousedown', (e) => e.preventDefault());
    });

    btnBold.addEventListener('click', () => {
        document.execCommand('bold');
        MPopup.updateToolbarState();
    });

    btnItalic.addEventListener('click', () => {
        document.execCommand('italic');
        MPopup.updateToolbarState();
    });

    btnLink.addEventListener('click', () => {
        const url = prompt('Digite a URL do link:');
        if (url) document.execCommand('createLink', false, url);
    });

    editor.addEventListener('keyup', MPopup.updateToolbarState);
    editor.addEventListener('mouseup', MPopup.updateToolbarState);
    document.addEventListener('selectionchange', () => {
        if (document.activeElement === editor) MPopup.updateToolbarState();
    });

    // ---------- Inserir placeholder ----------
    btnPlaceholder.addEventListener('mousedown', (e) => e.preventDefault());
    btnPlaceholder.addEventListener('click', () => {
        editor.focus();

        const items = [{ key: 'data' }].concat(MPopup.currentState.placeholders || []);
        if (placeholderMenu.style.display === 'block' && placeholderMenu.dataset.filled === '1') {
            placeholderMenu.style.display = 'none';
            return;
        }

        placeholderMenu.innerHTML = '';
        placeholderMenu.dataset.filled = '1';

        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'ph-menu-empty';
            empty.textContent = 'Nenhum placeholder.';
            placeholderMenu.appendChild(empty);
        } else {
            items.forEach((placeholder) => {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'ph-menu-item';
                item.textContent = `{{${placeholder.key}}}`;
                item.setAttribute('role', 'menuitem');
                item.addEventListener('mousedown', (e) => e.preventDefault());
                item.addEventListener('click', () => {
                    document.execCommand('insertText', false, `{{${placeholder.key}}}`);
                    placeholderMenu.style.display = 'none';
                    editor.focus();
                    MPopup.setDirty(editor.innerHTML !== MPopup.lastSaved);
                });
                placeholderMenu.appendChild(item);
            });
        }

        placeholderMenu.style.display = 'block';
    });

    document.addEventListener('mousedown', (e) => {
        if (!placeholderMenu.contains(e.target) && !btnPlaceholder.contains(e.target)) {
            placeholderMenu.style.display = 'none';
        }
    });
};