/**
 * Padronização de logs e histórico de ações.
 * Requer: constants.
 */
function logAction(actionName, onDone) {
    chrome.storage.local.get([ACTION_HISTORY_KEY], (res) => {
        let history = res[ACTION_HISTORY_KEY] || [];
        history.unshift({ action: actionName, date: new Date().toLocaleString('pt-BR') });
        if (history.length > ACTION_HISTORY_LIMIT) history.pop();
        chrome.storage.local.set({ [ACTION_HISTORY_KEY]: history }, onDone);
    });
}