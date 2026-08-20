/**
 * Onboarding in-context: mostra um toast de boas-vindas no primeiro site
 * permitido visitado, apontando para as Configurações. Dispara uma única vez,
 * controlado por `hasSeenFirstSite` em storage.local.
 *
 * Requer: domUtils (showToast), constants.
 */

const FIRST_SITE_KEY = 'hasSeenFirstSite';

function maybeShowInContextOnboarding() {
    // Não dispara em iframes (ex.: editor do Kendo/Cervello) para evitar
    // múltiplos toasts na mesma página.
    if (window.top !== window.self) return;

    try {
        chrome.storage.local.get([FIRST_SITE_KEY], (res) => {
            if (res[FIRST_SITE_KEY]) return;

            chrome.storage.local.set({ [FIRST_SITE_KEY]: true }, () => {
                if (chrome.runtime.lastError) return;

                // Aguarda o DOM estabilizar para o toast aparecer sobre o site.
                setTimeout(() => {
                    showToast('Bem-vindo(a) à M! Configure sua assinatura nas Configurações da extensão.');
                }, 800);
            });
        });
    } catch (_err) {
        // Nunca quebra a página do host.
    }
}

maybeShowInContextOnboarding();