/**
 * Aba Sites Permitidos.
 * Requer: app-state (namespace MOptions).
 */

window.MOptions = window.MOptions || {};

MOptions.initSites = function () {
    const { newSiteInput, addSiteBtn, sitesList } = MOptions.refs;

    function renderSitesList() {
        sitesList.innerHTML = '';
        MOptions.state.allowedSites.forEach((site) => {
            const li = document.createElement('li');
            li.className = 'site-item site-item-profile';

            const span = document.createElement('span');
            span.textContent = site;

            const select = document.createElement('select');
            select.className = 'site-profile-select';
            select.setAttribute('aria-label', `Perfil padrão para ${site}`);
            MOptions.state.profiles.forEach((profile) => {
                const option = document.createElement('option');
                option.value = profile.id;
                option.textContent = profile.name;
                select.appendChild(option);
            });
            select.value = (MOptions.state.siteProfileMap && MOptions.state.siteProfileMap[site]) || MOptions.state.activeProfileId;
            select.addEventListener('change', () => {
                MOptions.state.siteProfileMap = MOptions.state.siteProfileMap || {};
                MOptions.state.siteProfileMap[site] = select.value;
                MOptions.persistState(() => {
                    MOptions.showStatus(`Perfil padrão de ${site} atualizado.`);
                    logAction(`Perfil padrão de ${site} definido`, MOptions.renderHistory);
                });
            });

            const btn = document.createElement('button');
            btn.textContent = 'Remover';
            btn.type = 'button';

            btn.onclick = () => {
                if (MOptions.state.allowedSites.length === 1) {
                    MOptions.showStatus('A extensão precisa de pelo menos um site permitido.', true);
                    return;
                }

                // Remoção silenciosa e imediata
                MOptions.state.allowedSites = MOptions.state.allowedSites.filter((s) => s !== site);
                if (MOptions.state.siteProfileMap) {
                    delete MOptions.state.siteProfileMap[site];
                }
                MOptions.persistState(() => {
                    renderSitesList();
                    MOptions.showStatus('Site removido.');
                    logAction(`Site permitido removido: ${site}`, MOptions.renderHistory);
                });
            };

            const controls = document.createElement('div');
            controls.className = 'site-controls';
            controls.appendChild(select);
            controls.appendChild(btn);

            li.appendChild(span);
            li.appendChild(controls);
            sitesList.appendChild(li);
        });
    }

    function addSiteToState(normalized) {
        if (MOptions.state.allowedSites.includes(normalized)) {
            MOptions.showStatus('Este domínio já está na lista.', true);
            newSiteInput.value = '';
            return;
        }

        MOptions.state.allowedSites.push(normalized);
        renderSitesList();
        newSiteInput.value = '';
        MOptions.persistState(() => {
            MOptions.showStatus('Site adicionado com sucesso!');
            logAction(`Site permitido adicionado: ${normalized}`, MOptions.renderHistory);
        });
    }

    addSiteBtn.addEventListener('click', () => {
        const rawSite = newSiteInput.value;
        const normalized = normalizeSiteEntry(rawSite);

        if (!normalized) {
            MOptions.showStatus('Domínio inválido. Ex: painel.empresa.com', true);
            return;
        }

        if (MOptions.state.allowedSites.includes(normalized)) {
            MOptions.showStatus('Este domínio já está na lista.', true);
            newSiteInput.value = '';
            return;
        }

        const origin = `*://${normalized}/*`;

        chrome.permissions.contains({ origins: [origin] }, (hasPermission) => {
            if (hasPermission) {
                addSiteToState(normalized);
                return;
            }

            chrome.permissions.request({ origins: [origin] }, (granted) => {
                // Em alguns fluxos o Chrome já concede a permissão mas o
                // `request` retorna `false`. Confirma via `contains` antes
                // de decidir, para não perder a adição.
                if (granted) {
                    addSiteToState(normalized);
                    return;
                }

                chrome.permissions.contains({ origins: [origin] }, (confirmed) => {
                    if (confirmed) {
                        addSiteToState(normalized);
                        return;
                    }
                    MOptions.showStatus('Permissão recusada. A extensão não funcionará neste site.', true);
                });
            });
        });
    });

    MOptions.renderSitesList = renderSitesList;
};