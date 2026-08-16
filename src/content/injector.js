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

    const menu = document.createElement('div');
    menu.id = M_MENU_ID;
    menu.style.cssText = `
        display: none; position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: #FFFFFF; border: 1px solid #DFE1E6; border-radius: 8px;
        box-shadow: 0 12px 32px rgba(9, 30, 66, 0.25);
        padding: 6px 0; z-index: 2147483647;
        min-width: 260px; max-width: 90vw; max-height: 80vh; overflow-y: auto;
    `;

    // mousedown para interceptar o clique antes do Jira
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        document.querySelectorAll(`#${M_MENU_ID}`).forEach((m) => {
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

        // Busca o estado mais recente direto do storage ao clicar, garantindo que o cache não atrase
        loadStateFromStorage((currentState) => {
            loading.remove();
            const profiles = currentState.profiles || [];

            if (profiles.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = 'Nenhum perfil configurado.';
                empty.style.cssText = 'padding: 8px 12px; font-size: 12px; color: #DE350B;';
                menu.appendChild(empty);
            } else {
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

                        // Prioriza o editor atualmente focado (mesmo caminho dos
                        // atalhos) e, se não houver, tenta pela estrutura da toolbar.
                        const focused = findActiveEditorTarget();
                        const targetEditor = focused
                            ? focused.targetElement
                            : findEditorFromToolbar(toolbar);
                        const isContentEditable = focused ? focused.isContentEditable : true;

                        if (targetEditor) {
                            targetEditor.focus();
                            // Atualiza a variável global temporariamente para a injeção usar os dados certos
                            cachedState = currentState;
                            insertSignature(targetEditor, isContentEditable, index);
                        } else {
                            showToast('Erro: Não foi possível localizar a área de texto do editor.');
                        }
                    });

                    menu.appendChild(item);
                });
            }
        });
    });

    // Fecha o menu clicando fora (fora do container e fora do próprio menu)
    document.addEventListener('mousedown', (e) => {
        if (!container.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = 'none';
        }
    });

    container.appendChild(btn);
    document.body.appendChild(menu);
    toolbar.appendChild(container);
}