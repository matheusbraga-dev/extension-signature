/**
 * Estado global e helpers compartilhados das Opções.
 * Registra tudo em `window.MOptions` (namespace global, sem build).
 * Requer: constants, sanitize, normalizer, logger e storage (via script tags).
 */

window.MOptions = window.MOptions || {};

MOptions.state = createDefaultState();
MOptions.selectedProfileId = MOptions.state.activeProfileId;
MOptions.refs = {};

MOptions.showStatus = function (message, isError) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.style.display = 'block';

    if (isError) {
        status.style.borderColor = 'var(--danger)';
        status.style.color = 'var(--danger)';
        status.style.background = 'var(--danger-soft)';
    } else {
        status.style.borderColor = 'var(--success)';
        status.style.color = 'var(--success)';
        status.style.background = 'var(--success-soft)';
    }

    clearTimeout(MOptions._statusTimer);
    MOptions._statusTimer = setTimeout(() => {
        status.style.display = 'none';
    }, 3000);
};

MOptions.persistState = function (onDone) {
    saveState(MOptions.state, () => {
        if (isUsingLocalFallback()) {
            MOptions.showStatus('Armazenamento grande demais para sync — salvo apenas neste dispositivo.', true);
        }
        if (onDone) onDone();
    }, () => {
        MOptions.showStatus('Erro ao salvar no storage.sync.', true);
    });
};

MOptions.renderHistory = function () {
    const historyList = MOptions.refs.historyList;
    readActionHistory((history) => {
        historyList.innerHTML = '';
        if (history.length === 0) {
            historyList.innerHTML = '<li class="site-item" style="justify-content: center; color: var(--muted);">Nenhuma atividade recente.</li>';
            return;
        }
        history.forEach((item) => {
            const li = document.createElement('li');
            li.className = 'site-item';
            li.innerHTML = `<span><b>${item.action}</b></span><span style="font-size: 11px; color: var(--muted);">${item.date}</span>`;
            historyList.appendChild(li);
        });
    });
};

MOptions.renderProfileOptions = function () {
    const profileSelect = MOptions.refs.profileSelect;
    profileSelect.innerHTML = '';
    MOptions.state.profiles.forEach((profile) => {
        const option = document.createElement('option');
        option.value = profile.id;
        option.textContent = `${profile.name}${profile.id === MOptions.state.activeProfileId ? ' (ativo)' : ''}`;
        profileSelect.appendChild(option);
    });
    profileSelect.value = MOptions.selectedProfileId;
};

MOptions.getSelectedProfile = function () {
    return MOptions.state.profiles.find((profile) => profile.id === MOptions.selectedProfileId) || MOptions.state.profiles[0];
};

MOptions.renderSelectedProfile = function () {
    const profile = MOptions.getSelectedProfile();
    if (!profile) return;
    MOptions.selectedProfileId = profile.id;
    MOptions.refs.profileSelect.value = profile.id;
    MOptions.refs.profileName.value = profile.name;
    MOptions.refs.profileEditor.innerHTML = profile.html;
};

MOptions.updateSelectedProfileValues = function () {
    const index = MOptions.state.profiles.findIndex((profile) => profile.id === MOptions.selectedProfileId);
    if (index < 0) return;
    MOptions.state.profiles[index] = {
        ...MOptions.state.profiles[index],
        name: MOptions.refs.profileName.value.trim() || `Perfil ${index + 1}`,
        html: sanitizeSignatureHtml(MOptions.refs.profileEditor.innerHTML)
    };
};

MOptions.makeProfileId = function () {
    return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};