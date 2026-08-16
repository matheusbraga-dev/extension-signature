/**
 * Aba Histórico de Ações + onboarding inicial.
 * Requer: app-state (namespace MOptions).
 */

window.MOptions = window.MOptions || {};

MOptions.initHistory = function () {
    document.getElementById('clear-history-btn').addEventListener('click', () => {
        try {
            clearActionHistory(() => {
                MOptions.renderHistory();
                MOptions.showStatus('Histórico limpo com sucesso!');
            });
        } catch (e) {
            MOptions.showStatus('Erro ao limpar histórico. Tente novamente.', true);
        }
    });

    const onboardingModal = document.getElementById('onboarding-modal');
    chrome.storage.local.get(['hasSeenOnboarding'], (res) => {
        if (!res.hasSeenOnboarding) {
            onboardingModal.showModal();
        }
    });
    document.getElementById('close-onboarding-btn').addEventListener('click', () => {
        chrome.storage.local.set({ hasSeenOnboarding: true }, () => {
            onboardingModal.close();
            logAction('Concluiu o Onboarding', MOptions.renderHistory);
        });
    });
};