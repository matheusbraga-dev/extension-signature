/**
 * Gerenciamento do menu de contexto (clique com o botão direito).
 * Requer: constants e background/index.js (dispatchInsert).
 */
function ensureContextMenu() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: MENU_INSERT_ID,
            title: 'M - Inserir assinatura aqui',
            contexts: ['editable']
        });
    });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_INSERT_ID) return;
    dispatchInsert(tab && tab.id, null);
});