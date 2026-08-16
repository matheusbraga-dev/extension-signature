/**
 * Aba Perfis de Assinatura.
 * Requer: app-state (namespace MOptions).
 */

window.MOptions = window.MOptions || {};

MOptions.initProfiles = function () {
    const {
        profileSelect,
        profileName,
        saveProfileBtn,
        addProfileBtn,
        duplicateProfileBtn,
        removeProfileBtn,
        setActiveBtn
    } = MOptions.refs;

    profileSelect.addEventListener('change', () => {
        MOptions.updateSelectedProfileValues();
        MOptions.selectedProfileId = profileSelect.value;
        MOptions.renderProfileOptions();
        MOptions.renderSelectedProfile();
    });

    saveProfileBtn.addEventListener('click', () => {
        MOptions.updateSelectedProfileValues();
        MOptions.state.activeProfileId = MOptions.selectedProfileId;
        MOptions.persistState(() => {
            MOptions.renderProfileOptions();
            MOptions.renderSelectedProfile();
            MOptions.showStatus('Perfil salvo com sucesso!');
            logAction(`Perfil salvo: ${profileName.value || 'Padrão'}`, MOptions.renderHistory);
        });
    });

    addProfileBtn.addEventListener('click', () => {
        MOptions.updateSelectedProfileValues();
        const newProfile = { id: MOptions.makeProfileId(), name: `Perfil ${MOptions.state.profiles.length + 1}`, html: '' };
        MOptions.state.profiles.push(newProfile);
        MOptions.selectedProfileId = newProfile.id;
        MOptions.renderProfileOptions();
        MOptions.renderSelectedProfile();
        logAction(`Perfil criado: ${newProfile.name}`, MOptions.renderHistory);
    });

    duplicateProfileBtn.addEventListener('click', () => {
        MOptions.updateSelectedProfileValues();
        const selected = MOptions.getSelectedProfile();
        if (!selected) return;
        const duplicate = { id: MOptions.makeProfileId(), name: `${selected.name} (cópia)`, html: selected.html };
        MOptions.state.profiles.push(duplicate);
        MOptions.selectedProfileId = duplicate.id;
        MOptions.renderProfileOptions();
        MOptions.renderSelectedProfile();
        logAction(`Perfil duplicado: ${duplicate.name}`, MOptions.renderHistory);
    });

    removeProfileBtn.addEventListener('click', () => {
        if (MOptions.state.profiles.length === 1) {
            MOptions.showStatus('Você precisa manter ao menos um perfil.', true);
            return;
        }
        const removedName = MOptions.getSelectedProfile()?.name || 'Perfil';
        MOptions.state.profiles = MOptions.state.profiles.filter((profile) => profile.id !== MOptions.selectedProfileId);
        if (!MOptions.state.profiles.some((profile) => profile.id === MOptions.state.activeProfileId)) {
            MOptions.state.activeProfileId = MOptions.state.profiles[0].id;
        }
        MOptions.selectedProfileId = MOptions.state.profiles[0].id;
        MOptions.renderProfileOptions();
        MOptions.renderSelectedProfile();
        logAction(`Perfil excluído: ${removedName}`, MOptions.renderHistory);
    });

    setActiveBtn.addEventListener('click', () => {
        MOptions.updateSelectedProfileValues();
        MOptions.state.activeProfileId = MOptions.selectedProfileId;
        MOptions.renderProfileOptions();
        MOptions.showStatus('Perfil ativo definido. Clique em salvar para persistir.');
        logAction(`Perfil ativo definido: ${MOptions.getSelectedProfile()?.name || 'Perfil'}`, MOptions.renderHistory);
    });
};