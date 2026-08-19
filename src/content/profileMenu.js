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

    // Painel de pré-visualização do perfil (aparece ao passar o mouse).
    const preview = document.createElement('div');
    preview.style.cssText = `
        display: none; position: fixed; z-index: 2147483646; pointer-events: none;
        background: #FFFFFF; border: 1px solid #DFE1E6; border-radius: 8px;
        box-shadow: 0 12px 32px rgba(9, 30, 66, 0.2);
        padding: 12px 14px; max-width: 320px; max-height: 240px;
        overflow-y: auto; color: #172B4D; font-size: 13px; line-height: 1.45;
    `;
    document.body.appendChild(preview);

    function close() {
        menu.style.display = 'none';
        preview.style.display = 'none';
    }

    function showPreview(anchor, html) {
        preview.innerHTML = html || '';
        if (!html) {
            preview.style.display = 'none';
            return;
        }
        preview.style.display = 'block';

        const rect = anchor.getBoundingClientRect();
        const gap = 12;
        let left = rect.right + gap;
        if (left + preview.offsetWidth > window.innerWidth - 8) {
            left = Math.max(8, rect.left - gap - preview.offsetWidth);
        }
        const top = Math.max(8, Math.min(rect.top, window.innerHeight - 8 - preview.offsetHeight));
        preview.style.left = `${left}px`;
        preview.style.top = `${top}px`;
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

        function clearBody() {
            while (menu.lastChild && menu.lastChild !== header) {
                menu.removeChild(menu.lastChild);
            }
        }

        function renderProfiles(state) {
            clearBody();
            const profiles = (state && Array.isArray(state.profiles)) ? state.profiles : [];

            if (profiles.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = 'Nenhum perfil configurado.';
                empty.style.cssText = 'padding: 8px 12px; font-size: 12px; color: #DE350B;';
                menu.appendChild(empty);
                return;
            }

            profiles.forEach((profile, index) => {
                const item = document.createElement('div');
                item.dataset.profile = String(index);
                item.textContent = profile.name;
                item.style.cssText = `
                    padding: 8px 12px; cursor: pointer; font-size: 13px;
                    color: #172B4D; font-family: -apple-system, sans-serif;
                    transition: background 0.1s; display: block; white-space: nowrap;
                    overflow: hidden; text-overflow: ellipsis;
                `;
                item.onmouseover = () => {
                    item.style.background = '#F4F5F7';
                    const hydrated = typeof applyDynamicPlaceholders === 'function'
                        ? applyDynamicPlaceholders(profile.html, state.placeholders)
                        : profile.html;
                    const safe = typeof sanitizeSignatureHtml === 'function'
                        ? sanitizeSignatureHtml(hydrated)
                        : hydrated;
                    showPreview(item, safe);
                };
                item.onmouseout = () => {
                    item.style.background = 'transparent';
                    preview.style.display = 'none';
                };

                item.addEventListener('mousedown', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    close();

                    const target = resolveEditor();
                    if (!target) {
                        showToast('Selecione primeiro um campo de texto editável.');
                        return;
                    }

                    // Garante que a injeção use os dados mais recentes.
                    cachedState = state;
                    insertSignature(
                        target.targetElement,
                        target.isContentEditable,
                        index,
                        useExecCommand
                    );
                });

                menu.appendChild(item);
            });
        }

        let rendered = false;

        // Renderiza imediatamente a partir do cache (quando disponível), para
        // nunca ficar preso em "Carregando perfis...", e depois atualiza via
        // storage. Tem fallback por timeout caso o storage não responda.
        if (cachedState) {
            rendered = true;
            renderProfiles(cachedState);
        }

        try {
            loadStateFromStorage(renderProfiles);
        } catch (_err) {
            if (!rendered) renderProfiles(cachedState || createDefaultState());
        }

        setTimeout(() => {
            if (!rendered) renderProfiles(cachedState || createDefaultState());
        }, 1500);
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