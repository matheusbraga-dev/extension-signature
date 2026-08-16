/**
 * Helpers puros do popup (sem dependência de DOM/estado).
 * Registra tudo em `window.MPopup` (namespace global, sem build).
 */

window.MPopup = window.MPopup || {};

MPopup.getTodayDateString = function () {
    return new Intl.DateTimeFormat('pt-BR').format(new Date());
};

MPopup.applyDynamicPlaceholders = function (html, placeholders) {
    let safeHtml = typeof html === 'string' ? html : '';
    const date = MPopup.getTodayDateString();
    const map = { data: date };

    (Array.isArray(placeholders) ? placeholders : []).forEach((placeholder) => {
        if (placeholder && typeof placeholder.key === 'string' && placeholder.key.trim()) {
            map[placeholder.key.trim().toLowerCase()] = String(placeholder.value ?? '');
        }
    });

    for (const [key, value] of Object.entries(map)) {
        const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        safeHtml = safeHtml.replace(new RegExp(`\\{\\{\\s*${safeKey}\\s*\\}\\}`, 'gi'), value);
    }

    return safeHtml;
};

MPopup.htmlToPlainText = function (html) {
    return html
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
};