/**
 * Ações do popup: trocar perfil, salvar, copiar e abrir opções.
 * Requer: sanitize, logger, popup-utils e popup-state (via script tags).
 */

window.MPopup = window.MPopup || {};

MPopup.copyHtmlToClipboard = async function (html, placeholders) {
    const dynamicHtml = MPopup.applyDynamicPlaceholders(html, placeholders);
    const plainText = MPopup.htmlToPlainText(dynamicHtml);

    if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
            'text/html': new Blob([dynamicHtml], { type: 'text/html' })
        });
        await navigator.clipboard.write([item]);
        return;
    }

    if (navigator.clipboard) {
        await navigator.clipboard.writeText(plainText);
        return;
    }

    const fallback = document.createElement('textarea');
    fallback.value = plainText;
    document.body.appendChild(fallback);
    fallback.select();
    document.execCommand('copy');
    fallback.remove();
};

MPopup.initActions = function () {
    const { editor, saveBtn, saveLabel, copyBtn, optionsBtn, profileSelect } = MPopup.refs;

    profileSelect.addEventListener('change', () => {
        if (!MPopup.isExtension) return;

        const cleanCurrent = sanitizeSignatureHtml(editor.innerHTML);
        MPopup.setProfileHtml(MPopup.currentProfileId, cleanCurrent);
        MPopup.currentState.activeProfileId = profileSelect.value;

        MPopup.persistState(() => {
            MPopup.switchToProfile(profileSelect.value);
            logAction(`Perfil ativo alterado: ${MPopup.getProfileById(profileSelect.value)?.name || 'Perfil'}`);
        });
    });

    saveBtn.addEventListener('click', () => {
        if (!MPopup.isExtension || saveBtn.disabled) return;

        // Sanitiza também no momento de salvar, como segunda camada de
        // proteção (cobre colagens fora do listener de paste, arrastar
        // texto etc.) — o que é salvo é exatamente o que fica visível.
        const clean = sanitizeSignatureHtml(editor.innerHTML);
        editor.innerHTML = clean;
        MPopup.setProfileHtml(MPopup.currentProfileId, clean);
        MPopup.currentState.activeProfileId = MPopup.currentProfileId;

        saveBtn.disabled = true;
        saveLabel.textContent = 'Salvando...';

        MPopup.persistState(() => {
            MPopup.lastSaved = clean;
            MPopup.setDirty(false);
            saveLabel.textContent = 'Salvar assinatura';
            MPopup.showStatusMessage('Assinatura salva com sucesso!');
        });
        logAction('Assinatura editada rapidamente (Popup)');
    });

    copyBtn.addEventListener('click', async () => {
        if (!MPopup.isExtension) return;

        try {
            const clean = sanitizeSignatureHtml(editor.innerHTML);
            await MPopup.copyHtmlToClipboard(clean, MPopup.currentState.placeholders);
            MPopup.showStatusMessage('Assinatura copiada para a área de transferência!');
            logAction('Assinatura copiada (Popup)');
        } catch (_error) {
            MPopup.showStatusMessage('Não foi possível copiar automaticamente.');
        }
    });

    optionsBtn.addEventListener('click', () => {
        if (!MPopup.isExtension) return;
        window.location.href = '../options/index.html';
    });
};