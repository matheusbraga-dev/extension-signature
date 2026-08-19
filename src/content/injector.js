/**
 * Injeção da UI nativa (botão + menu) na toolbar do Jira.
 * Requer: constants, normalizer, storage, domUtils e content/index.js
 * (que define cachedState e insertSignature).
 */

const M_ICON_SVG = `
<svg width="18" height="18" viewBox="0 0 34 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 15C4 6 7 4 9 9C11 14 13 15 15 10C17 5 20 3 22 8C24 13 26 15 28 11C29.5 8 31 7 32 9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
</svg>`;

function injectMButtonIntoToolbar(toolbar) {
    // Evita duplicatas na mesma barra
    if (toolbar.querySelector(`#${M_BTN_ID}`)) return;

    const container = document.createElement('div');
    container.id = M_BTN_ID;
    container.style.position = 'relative';
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.marginLeft = '4px';

    const btn = document.createElement('button');
    btn.innerHTML = M_ICON_SVG;
    btn.title = "M - Inserir Assinatura";
    btn.setAttribute('aria-label', 'Inserir Assinatura');

    btn.style.cssText = `
        background: transparent; border: none; cursor: pointer;
        padding: 0 8px; border-radius: 3px; color: #6B778C;
        display: flex; align-items: center; justify-content: center;
        height: 32px; transition: background 0.1s, color 0.1s;
    `;

    btn.onmouseover = () => { btn.style.background = 'rgba(9, 30, 66, 0.08)'; btn.style.color = '#0A3A5C'; };
    btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = '#6B778C'; };

    const ctrl = createProfileMenu({
        trigger: btn,
        menuId: M_MENU_ID,
        useExecCommand: false,
        resolveEditor: () => {
            // Prioriza o editor atualmente focado (mesmo caminho dos atalhos)
            // e, se não houver, tenta pela estrutura da toolbar.
            const focused = findActiveEditorTarget();
            if (focused) return focused;
            const editor = findEditorFromToolbar(toolbar);
            return editor ? { targetElement: editor, isContentEditable: true } : null;
        }
    });
    attachMenuTrigger(btn, ctrl);

    container.appendChild(btn);
    toolbar.appendChild(container);
}