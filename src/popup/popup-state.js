/**
 * Estado do popup e renderização de perfis.
 * Requer: constants, normalizer, storage e popup-utils (via script tags).
 */

window.MPopup = window.MPopup || {};

MPopup.isExtension = typeof chrome !== 'undefined' && chrome.storage;
MPopup.currentState = createDefaultState();
MPopup.currentProfileId = MPopup.currentState.activeProfileId;
MPopup.lastSaved = '';
MPopup.refs = {};
MPopup._statusTimer = null;

MPopup.setDirty = function (isDirty) {
    MPopup.refs.saveBtn.disabled = !isDirty;
    MPopup.refs.dirtyHint.style.display = isDirty ? 'block' : 'none';
};

MPopup.updateToolbarState = function () {
    MPopup.refs.btnBold.classList.toggle('is-active', document.queryCommandState('bold'));
    MPopup.refs.btnItalic.classList.toggle('is-active', document.queryCommandState('italic'));
};

MPopup.getProfileById = function (profileId) {
    return MPopup.currentState.profiles.find((profile) => profile.id === profileId) || null;
};

MPopup.renderProfileOptions = function () {
    const profileSelect = MPopup.refs.profileSelect;
    profileSelect.innerHTML = '';

    MPopup.currentState.profiles.forEach((profile) => {
        const option = document.createElement('option');
        option.value = profile.id;
        option.textContent = profile.name;
        profileSelect.appendChild(option);
    });

    profileSelect.value = MPopup.currentProfileId;
};

MPopup.switchToProfile = function (profileId) {
    const profile = MPopup.getProfileById(profileId);
    if (!profile) return;

    MPopup.currentProfileId = profile.id;
    MPopup.refs.profileSelect.value = profile.id;
    MPopup.refs.editor.innerHTML = profile.html;
    MPopup.lastSaved = profile.html;
    MPopup.setDirty(false);
};

MPopup.setProfileHtml = function (profileId, html) {
    MPopup.currentState = normalizeState({
        ...MPopup.currentState,
        activeProfileId: profileId,
        profiles: MPopup.currentState.profiles.map((profile) => (
            profile.id === profileId ? { ...profile, html } : profile
        ))
    });
};

MPopup.persistState = function (onDone) {
    saveState(MPopup.currentState, () => {
        if (isUsingLocalFallback()) {
            MPopup.showStatusMessage('Assinatura grande demais para sync — salva apenas neste dispositivo.');
            if (onDone) onDone();
            return;
        }
        if (onDone) onDone();
    }, () => {
        MPopup.refs.saveLabel.textContent = 'Salvar assinatura';
        MPopup.setDirty(true);
        MPopup.showStatusMessage('Falha ao salvar no sync. Tente novamente.');
    });
};

MPopup.showStatusMessage = function (message) {
    const status = MPopup.refs.status;
    status.style.display = 'block';
    status.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="10" cy="10" r="8"></circle>
          <path d="M6.5 10.2l2.3 2.3 4.7-4.8"></path>
        </svg>
        ${message}
    `;
    clearTimeout(MPopup._statusTimer);
    MPopup._statusTimer = setTimeout(() => { status.style.display = 'none'; }, 2200);
};