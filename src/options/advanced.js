/**
 * Aba Avançado e Backup (atalhos, exportar/importar, restaurar).
 * Requer: app-state (namespace MOptions).
 */

window.MOptions = window.MOptions || {};

MOptions.initAdvanced = function () {
    const { openShortcutsBtn, exportBtn, importBtn, backupJson, fabToggle } = MOptions.refs;

    openShortcutsBtn.addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));

    MOptions.renderFabToggle = function () {
        if (fabToggle) fabToggle.checked = MOptions.state.showFloatingButton !== false;
    };

    if (fabToggle) {
        fabToggle.addEventListener('change', () => {
            MOptions.state.showFloatingButton = fabToggle.checked;
            MOptions.persistState(() => {
                MOptions.showStatus('Preferência salva.');
                logAction('Visibilidade do botão flutuante atualizada', MOptions.renderHistory);
            });
        });
    }

    exportBtn.addEventListener('click', () => {
        MOptions.updateSelectedProfileValues();
        backupJson.value = JSON.stringify(MOptions.state, null, 2);
        MOptions.showStatus('JSON exportado para a caixa de texto.');
        logAction('Backup JSON exportado', MOptions.renderHistory);
    });

    importBtn.addEventListener('click', () => {
        const raw = backupJson.value.trim();
        if (!raw) {
            MOptions.showStatus('Cole um JSON para importar.', true);
            return;
        }
        try {
            const parsed = JSON.parse(raw);
            const newState = normalizeState(parsed);

            // Requisita permissões em lote para os sites do backup JSON
            const origins = newState.allowedSites.map((site) => `*://${site}/*`);

            chrome.permissions.request({ origins }, (granted) => {
                const apply = () => {
                    MOptions.state = newState;
                    MOptions.selectedProfileId = MOptions.state.activeProfileId;
                    MOptions.renderProfileOptions();
                    MOptions.renderSelectedProfile();
                    MOptions.renderSitesList();
                    MOptions.renderPlaceholders();
                    MOptions.persistState(() => {
                        MOptions.showStatus('Backup importado com sucesso!');
                        logAction('Backup JSON importado', MOptions.renderHistory);
                    });
                };

                if (granted) {
                    apply();
                    return;
                }

                // Confirma via `contains` para não perder a importação quando
                // o `request` retorna `false` mesmo após o usuário aceitar.
                chrome.permissions.contains({ origins }, (confirmed) => {
                    if (confirmed) {
                        apply();
                        return;
                    }
                    MOptions.showStatus('Permissão necessária para importar os domínios do backup.', true);
                });
            });
        } catch (_error) {
            MOptions.showStatus('JSON inválido. Verifique o conteúdo.', true);
        }
    });

    // Restauração de Fábrica com Tratamento de Erro
    document.getElementById('reset-settings-btn').addEventListener('click', () => {
        if (confirm('Atenção: Isso apagará tudo permanentemente. Deseja continuar?')) {
            try {
                chrome.storage.sync.clear(() => {
                    chrome.storage.local.clear(() => {
                        alert('Extensão restaurada com sucesso!');
                        window.location.reload();
                    });
                });
            } catch (e) {
                MOptions.showStatus('Falha crítica ao restaurar. Reinicie o navegador.', true);
            }
        }
    });
};