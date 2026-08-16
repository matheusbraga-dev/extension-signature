/**
 * Ponto de entrada das Opções: coleta referências DOM, liga a navegação por
 * abas, inicializa os módulos e carrega o estado do storage.
 * Requer: app-state, profiles, sites, placeholders, history e advanced.
 */

document.addEventListener('DOMContentLoaded', () => {
    const MOptions = window.MOptions;

    MOptions.refs = {
        profileSelect: document.getElementById('profile-select'),
        profileName: document.getElementById('profile-name'),
        profileEditor: document.getElementById('profile-editor'),
        saveProfileBtn: document.getElementById('save-profile-btn'),
        addProfileBtn: document.getElementById('add-profile-btn'),
        duplicateProfileBtn: document.getElementById('duplicate-profile-btn'),
        removeProfileBtn: document.getElementById('remove-profile-btn'),
        setActiveBtn: document.getElementById('set-active-btn'),
        newSiteInput: document.getElementById('new-site-input'),
        addSiteBtn: document.getElementById('add-site-btn'),
        sitesList: document.getElementById('sites-list'),
        openShortcutsBtn: document.getElementById('open-shortcuts-btn'),
        exportBtn: document.getElementById('export-btn'),
        importBtn: document.getElementById('import-btn'),
        backupJson: document.getElementById('backup-json'),
        placeholdersList: document.getElementById('placeholders-list'),
        addPlaceholderBtn: document.getElementById('add-placeholder-btn'),
        insertPlaceholderBtn: document.getElementById('insert-placeholder-btn'),
        optionsPlaceholderMenu: document.getElementById('options-placeholder-menu'),
        historyList: document.getElementById('history-list'),
        status: document.getElementById('status')
    };

    // Navegação por Abas
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            navBtns.forEach((b) => b.classList.remove('active'));
            tabContents.forEach((t) => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    // Inicializa os módulos
    MOptions.initHistory();
    MOptions.initProfiles();
    MOptions.initSites();
    MOptions.initPlaceholders();
    MOptions.initAdvanced();

    MOptions.renderHistory();

    // --- INICIALIZAÇÃO ---
    chrome.storage.sync.get([STORAGE_KEY], (syncResult) => {
        if (syncResult[STORAGE_KEY]) {
            MOptions.state = normalizeState(syncResult[STORAGE_KEY]);
            MOptions.selectedProfileId = MOptions.state.activeProfileId;
            MOptions.renderProfileOptions();
            MOptions.renderSelectedProfile();
            MOptions.renderSitesList();
            MOptions.renderPlaceholders();
            return;
        }

        chrome.storage.local.get([LEGACY_KEY], (localResult) => {
            const legacy = localResult[LEGACY_KEY];
            if (legacy) {
                MOptions.state = {
                    activeProfileId: 'default',
                    profiles: [{ id: 'default', name: 'Padrão', html: sanitizeSignatureHtml(legacy) }],
                    allowedSites: [...DEFAULT_ALLOWED_SITES],
                    placeholders: []
                };
                MOptions.persistState(() => {
                    removeLegacyState();
                    MOptions.renderProfileOptions();
                    MOptions.renderSelectedProfile();
                    MOptions.renderSitesList();
                    MOptions.renderPlaceholders();
                });
                return;
            }

            MOptions.state = createDefaultState();
            MOptions.renderProfileOptions();
            MOptions.renderSelectedProfile();
            MOptions.renderSitesList();
            MOptions.renderPlaceholders();
        });
    });
});