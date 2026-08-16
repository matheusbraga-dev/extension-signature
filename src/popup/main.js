/**
 * Ponto de entrada do popup: coleta de referências do DOM e wiring.
 * Requer: constants, sanitize, normalizer, logger, storage, popup-utils,
 * popup-state, popup-editor, popup-actions e popup-banner (via script tags).
 */

document.addEventListener('DOMContentLoaded', () => {
    const MPopup = window.MPopup;

    MPopup.refs = {
        editor: document.getElementById('editor'),
        saveBtn: document.getElementById('save-btn'),
        saveLabel: document.getElementById('save-btn-label'),
        status: document.getElementById('status'),
        dirtyHint: document.getElementById('dirty-hint'),
        btnBold: document.getElementById('btn-bold'),
        btnItalic: document.getElementById('btn-italic'),
        btnLink: document.getElementById('btn-link'),
        profileSelect: document.getElementById('profile-select'),
        copyBtn: document.getElementById('copy-btn'),
        optionsBtn: document.getElementById('options-btn'),
        btnPlaceholder: document.getElementById('btn-placeholder'),
        placeholderMenu: document.getElementById('placeholder-menu'),
        statusBanner: document.getElementById('site-status-banner')
    };

    MPopup.initEditor();
    MPopup.initActions();
    MPopup.initBanner();

    // ---------- Carregamento inicial ----------
    if (!MPopup.isExtension) {
        // Testando popup.html fora do contexto da extensão: não há onde
        // salvar, então deixamos isso claro em vez de simular sucesso.
        MPopup.refs.editor.setAttribute('data-placeholder', 'Abra pelo ícone da extensão para editar e salvar sua assinatura.');
        MPopup.refs.saveBtn.disabled = true;
        MPopup.refs.profileSelect.disabled = true;
        MPopup.refs.copyBtn.disabled = true;
        MPopup.refs.optionsBtn.disabled = true;
    } else {
        loadStateFromStorage((loadedState) => {
            MPopup.currentState = loadedState;
            MPopup.currentProfileId = MPopup.currentState.activeProfileId;

            MPopup.renderProfileOptions();
            MPopup.switchToProfile(MPopup.currentProfileId);

            // Migração silenciosa para sync quando só existia a chave legada.
            chrome.storage.sync.get([STORAGE_KEY], (syncResult) => {
                chrome.storage.local.get([LEGACY_KEY], (localResult) => {
                    if (!syncResult[STORAGE_KEY] && localResult[LEGACY_KEY]) {
                        MPopup.persistState(() => {
                            removeLegacyState();
                        });
                    }
                });
            });
        });
    }
});