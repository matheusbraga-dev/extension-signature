/**
 * Verificador de status do site (banner do topo).
 * Requer: normalizer e popup-state (via script tags).
 */

window.MPopup = window.MPopup || {};

MPopup.initBanner = function () {
    const statusBanner = MPopup.refs.statusBanner;
    if (!MPopup.isExtension) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url;
        if (!url) return;

        const hostname = normalizeSiteEntry(url);

        // Reutiliza a regra do background para checar permissão
        const isAllowed = MPopup.currentState.allowedSites.some((site) => hostname === site || hostname.endsWith(`.${site}`));

        if (isAllowed) {
            statusBanner.style.background = 'var(--success-soft)';
            statusBanner.style.color = 'var(--success)';
            statusBanner.innerHTML = '🟢 Extensão Ativa neste site';
        } else {
            statusBanner.style.background = 'var(--danger-soft)';
            statusBanner.style.color = 'var(--danger)';
            statusBanner.innerHTML = '🔴 Inativa (Adicione nas configurações)';
        }
    });
};