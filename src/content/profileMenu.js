/**
 * Menu de perfis compartilhado (botão nativo do Jira/Gmail e botão flutuante
 * do Cervello). Evita a duplicação de construção do menu entre os hosts.
 *
 * Requer (globais carregados antes): constants, normalizer, storage, logger,
 * domUtils e content/index.js (cachedState, insertSignature, showToast).
 */

function createProfileMenu(options) {
    const { trigger, menuId, resolveEditor, useExecCommand } = options;

    injectSharedStyles();

    const menu = document.createElement('div');
    menu.id = menuId;
    menu.className = 'M-sig-menu';
    menu.style.display = 'none';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Inserir assinatura');
    document.body.appendChild(menu);

    // Painel de pré-visualização do perfil (aparece ao passar o mouse).
    const preview = document.createElement('div');
    preview.className = 'M-sig-preview';
    preview.style.display = 'none';
    document.body.appendChild(preview);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'M-sig-menu-search';
    searchInput.setAttribute('placeholder', 'Buscar perfil...');
    searchInput.setAttribute('aria-label', 'Buscar perfil');

    function close() {
        menu.style.display = 'none';
        preview.style.display = 'none';
        trigger.setAttribute('aria-expanded', 'false');
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
        injectSharedStyles();
        document.querySelectorAll(`#${menuId}`).forEach((m) => {
            if (m !== menu) m.style.display = 'none';
        });

        if (menu.style.display === 'block') {
            close();
            return;
        }

        menu.innerHTML = '';
        menu.style.display = 'block';
        trigger.setAttribute('aria-expanded', 'true');

        const header = document.createElement('div');
        header.className = 'M-sig-menu-head';
        header.textContent = 'INSERIR ASSINATURA';
        menu.appendChild(header);
        menu.appendChild(searchInput);

        function clearBody() {
            while (menu.lastChild && menu.lastChild !== searchInput) {
                menu.removeChild(menu.lastChild);
            }
        }

        function renderProfiles(state) {
            clearBody();
            const profiles = (state && Array.isArray(state.profiles)) ? state.profiles : [];
            const query = (searchInput.value || '').trim().toLowerCase();
            const filtered = query ? profiles.filter((p) => p.name.toLowerCase().includes(query)) : profiles;

            if (filtered.length === 0) {
                const note = document.createElement('div');
                note.className = 'M-sig-menu-item is-empty-note';
                note.textContent = profiles.length === 0 ? 'Nenhum perfil configurado.' : 'Nenhum perfil encontrado.';
                menu.appendChild(note);
                return;
            }

            filtered.forEach((profile, visibleIndex) => {
                const originalIndex = profiles.indexOf(profile);
                const item = document.createElement('div');
                item.className = 'M-sig-menu-item';
                item.setAttribute('role', 'menuitem');
                item.setAttribute('tabindex', '0');
                item.textContent = profile.name;
                item.dataset.profile = String(originalIndex);

                const activateItem = () => {
                    close();
                    const target = resolveEditor();
                    if (!target) {
                        showToast('Selecione primeiro um campo de texto editável.');
                        return;
                    }
                    cachedState = state;
                    insertSignature(target.targetElement, target.isContentEditable, originalIndex, useExecCommand);
                };

                item.onmouseover = () => {
                    item.style.background = 'var(--m-bg-soft)';
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
                    activateItem();
                });
                item.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter') {
                        ev.preventDefault();
                        ev.stopPropagation();
                        activateItem();
                    } else if (ev.key === 'ArrowDown') {
                        ev.preventDefault();
                        moveFocus(1);
                    } else if (ev.key === 'ArrowUp') {
                        ev.preventDefault();
                        moveFocus(-1);
                    }
                });

                menu.appendChild(item);
            });
        }

        function moveFocus(direction) {
            const items = Array.from(menu.querySelectorAll('.M-sig-menu-item[role="menuitem"]'));
            if (items.length === 0) return;
            const idx = items.indexOf(document.activeElement);
            const next = idx === -1 ? 0 : (idx + direction + items.length) % items.length;
            items[next].focus();
        }

        searchInput.value = '';
        searchInput.addEventListener('input', () => {
            const stateNow = cachedState || createDefaultState();
            renderProfiles(stateNow);
            const first = menu.querySelector('.M-sig-menu-item[role="menuitem"]');
            if (first) first.focus();
        });
        searchInput.addEventListener('keydown', (ev) => {
            if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
                ev.preventDefault();
                moveFocus(ev.key === 'ArrowDown' ? 1 : -1);
            } else if (ev.key === 'Escape') {
                ev.preventDefault();
                close();
            }
        });

        let rendered = false;

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

        searchInput.focus();
    }

    // Fecha o menu clicando fora (fora do trigger e fora do próprio menu).
    document.addEventListener('mousedown', (e) => {
        if (!trigger.contains(e.target) && !menu.contains(e.target)) {
            close();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.style.display === 'block') {
            close();
        }
    });

    return { menu, open, close, searchInput };
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