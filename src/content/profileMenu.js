/**
 * Menu de perfis compartilhado (botão nativo do Jira/Gmail e botão flutuante
 * do Cervello). Evita a duplicação de construção do menu entre os hosts.
 *
 * Requer (globais carregados antes): constants, normalizer, storage, logger,
 * domUtils e content/index.js (cachedState, insertSignature, showToast).
 */

function createProfileMenu(options) {
    const { trigger, menuId, resolveEditor, useExecCommand } = options;

    const menu = document.createElement('div');
    menu.id = menuId;
    menu.style.cssText = `
        display: none; position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: #FFFFFF; border: 1px solid #DFE1E6; border-radius: 8px;
        box-shadow: 0 12px 32px rgba(9, 30, 66, 0.25);
        padding: 6px 0; z-index: 2147483647;
        min-width: 260px; max-width: 90vw; max-height: 80vh; overflow-y: auto;
    `;
    document.body.appendChild(menu);

    function close() {
        menu.style.display = 'none';
    }

    function open() {
        document.querySelectorAll(`#${menuId}`).forEach((m) => {
            if (m !== menu) m.style.display = 'none';
        });

        if (menu.style.display === 'block') {
            close();
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

        // Busca o estado mais recente direto do storage ao abrir, garantindo
        // que o cache não atrase os dados exibidos.
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
                    close();

                    const target = resolveEditor();
                    if (!target) {
                        showToast('Selecione primeiro um campo de texto editável.');
                        return;
                    }

                    // Garante que a injeção use os dados recém-carregados.
                    cachedState = currentState;
                    insertSignature(
                        target.targetElement,
                        target.isContentEditable,
                        index,
                        useExecCommand
                    );
                });

                menu.appendChild(item);
            });
        });
    }

    // Fecha o menu clicando fora (fora do trigger e fora do próprio menu).
    document.addEventListener('mousedown', (e) => {
        if (!trigger.contains(e.target) && !menu.contains(e.target)) {
            close();
        }
    });

    return { menu, open, close };
}

// Ativa o menu via mousedown (padrão para hosts que interceptam cliques,
// como Jira/ProseMirror e Gmail). O host não deve interceptar o trigger.
function attachMenuTrigger(trigger, ctrl) {
    trigger.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ctrl.open();
    });
}