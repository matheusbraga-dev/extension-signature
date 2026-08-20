/**
 * Aba Avançado e Backup (atalhos, exportar/importar, restaurar).
 * Requer: app-state (namespace MOptions).
 */

window.MOptions = window.MOptions || {};

MOptions.initAdvanced = function () {
    const { openShortcutsBtn, exportBtn, importFileBtn, importFile, exportJsonBtn, importJsonBtn, backupJson, fabToggle } = MOptions.refs;

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

    function currentStateJson() {
        MOptions.updateSelectedProfileValues();
        return JSON.stringify(MOptions.state, null, 2);
    }

    function downloadJson(json) {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `m-signature-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function requestOriginsForState(newState, onApply, onDeny) {
        const origins = (newState.allowedSites || []).map((site) => `*://${site}/*`);

        chrome.permissions.request({ origins }, (granted) => {
            if (granted) {
                onApply();
                return;
            }
            chrome.permissions.contains({ origins }, (confirmed) => {
                if (confirmed) {
                    onApply();
                    return;
                }
                if (onDeny) onDeny();
            });
        });
    }

    function applyState(newState) {
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
    }

    function importRaw(raw) {
        if (!raw.trim()) {
            MOptions.showStatus('Cole um JSON para importar.', true);
            return;
        }
        try {
            const newState = normalizeState(JSON.parse(raw));
            requestOriginsForState(
                newState,
                () => applyState(newState),
                () => MOptions.showStatus('Permissão necessária para importar os domínios do backup.', true)
            );
        } catch (_error) {
            MOptions.showStatus('JSON inválido. Verifique o conteúdo.', true);
        }
    }

    // Download real do arquivo .json
    exportBtn.addEventListener('click', () => {
        downloadJson(currentStateJson());
        MOptions.showStatus('Arquivo JSON baixado.');
        logAction('Backup JSON baixado', MOptions.renderHistory);
    });

    // File picker para importar
    importFileBtn.addEventListener('click', () => importFile.click());

    importFile.addEventListener('change', () => {
        const file = importFile.files && importFile.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            importRaw(String(reader.result || ''));
            importFile.value = '';
        };
        reader.onerror = () => {
            MOptions.showStatus('Falha ao ler o arquivo.', true);
            importFile.value = '';
        };
        reader.readAsText(file);
    });

    // Caixa de texto (forma manual, como antes)
    exportJsonBtn.addEventListener('click', () => {
        backupJson.value = currentStateJson();
        MOptions.showStatus('JSON exportado para a caixa de texto.');
        logAction('Backup JSON exportado', MOptions.renderHistory);
    });

    importJsonBtn.addEventListener('click', () => importRaw(backupJson.value));

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