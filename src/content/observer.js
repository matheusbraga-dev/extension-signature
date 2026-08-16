/**
 * MutationObserver que vigia as mudanças constantes do React no DOM do Jira
 * e injeta o botão da M na toolbar.
 * Requer: injector (injectMButtonIntoToolbar).
 */

const IS_JIRA = /(^|\.)atlassian\.net$/i.test(location.hostname);

if (IS_JIRA) {
    const jiraObserver = new MutationObserver(() => {
        // Busca flexível pela barra de ferramentas do Jira, independente do modo de visualização
        const toolbars = document.querySelectorAll('[data-testid="ak-editor-main-toolbar"], [role="toolbar"]');

        toolbars.forEach((toolbar) => {
            // Injeta apenas se a barra tiver vários itens ou for explicitamente a barra principal
            if (toolbar.getAttribute('data-testid') === 'ak-editor-main-toolbar' || toolbar.children.length > 3) {
                injectMButtonIntoToolbar(toolbar);
            }
        });
    });

    jiraObserver.observe(document.body, { childList: true, subtree: true });

    // Garantia: se o editor já estava aberto quando você deu F5 na página, injeta sem esperar mutação
    setTimeout(() => {
        const toolbars = document.querySelectorAll('[data-testid="ak-editor-main-toolbar"], [role="toolbar"]');
        toolbars.forEach((toolbar) => {
            if (toolbar.getAttribute('data-testid') === 'ak-editor-main-toolbar' || toolbar.children.length > 3) {
                injectMButtonIntoToolbar(toolbar);
            }
        });
    }, 1500);
}