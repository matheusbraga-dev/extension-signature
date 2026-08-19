/**
 * Suporte ao Cervello (cervelloesm.com.br): injeta um botão flutuante fixo no
 * canto inferior direito que abre o menu de perfis (compartilhado) e insere a
 * assinatura no campo atualmente focado (editor rico ou textarea).
 *
 * O botão é arrastável: ao soltar, a nova posição é persistida em
 * `cervelloFabPosition`. A visibilidade é controlada por `showFloatingButton`.
 * Ambos configuráveis em Configurações → Avançado e Backup.
 *
 * Requer: constants, sanitize, normalizer, storage, logger, domUtils,
 * content/index.js (cachedState e insertSignature) e content/profileMenu.js
 * (createProfileMenu), carregados antes via content_scripts/scripting.
 */

const CV_FAB_ID = 'M-cervello-fab';
const CV_MENU_ID = 'M-cervello-menu';
const DRAG_THRESHOLD = 5;

function isCervello() {
    return /(^|\.)cervelloesm\.com\.br$/i.test(location.hostname);
}

// O editor do Cervello é um Kendo UI Editor: um <iframe src=""> (about:blank,
// same-origin) cujo HTML editável fica no body. Localiza esses iframes e
// retorna o elemento editável real dentro do documento deles.
function findKendoEditorTarget() {
    const iframeSelectors = 'iframe.k-content, iframe[title*="Editable area"], iframe[data-role="editor"]';
    const iframes = document.querySelectorAll(iframeSelectors);
    if (iframes.length === 0) return null;

    for (const iframe of iframes) {
        let innerDoc;
        try {
            innerDoc = iframe.contentDocument;
        } catch (_err) {
            innerDoc = null;
        }
        if (!innerDoc || !innerDoc.body) continue;

        const editor = innerDoc.body.isContentEditable
            ? innerDoc.body
            : innerDoc.querySelector('[contenteditable="true"]');

        if (editor) {
            return { targetElement: editor, isContentEditable: true };
        }
    }

    return null;
}

function resolveTargetEditor() {
    const focused = findActiveEditorTarget();
    if (focused) return focused;
    const kendo = findKendoEditorTarget();
    if (kendo) return kendo;
    const editors = document.querySelectorAll('[contenteditable="true"], textarea, input[type="text"]');
    const last = editors[editors.length - 1];
    if (!last) return null;
    return {
        targetElement: last,
        isContentEditable: last.isContentEditable || last.tagName !== 'TEXTAREA'
    };
}

function applyFabPosition(fab) {
    const pos = cachedState ? cachedState.cervelloFabPosition : null;
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return;
    fab.style.left = `${pos.x}px`;
    fab.style.top = `${pos.y}px`;
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
}

function persistFabPosition(fab) {
    if (!cachedState) return;
    const next = {
        ...cachedState,
        cervelloFabPosition: { x: fab.offsetLeft, y: fab.offsetTop }
    };
    saveState(next, () => {});
}

function makeFabDraggable(fab) {
    let drag = null;
    let wasDragged = false;

    fab.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const rect = fab.getBoundingClientRect();
        drag = { startX: e.clientX, startY: e.clientY, left: rect.left, top: rect.top, moved: false };
        wasDragged = false;
        fab.setPointerCapture(e.pointerId);
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
        fab.style.left = `${rect.left}px`;
        fab.style.top = `${rect.top}px`;
    });

    fab.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

        drag.moved = true;
        e.preventDefault();

        const maxX = window.innerWidth - fab.offsetWidth;
        const maxY = window.innerHeight - fab.offsetHeight;
        const x = Math.max(0, Math.min(maxX, drag.left + dx));
        const y = Math.max(0, Math.min(maxY, drag.top + dy));
        fab.style.left = `${x}px`;
        fab.style.top = `${y}px`;
    });

    const endDrag = () => {
        if (!drag) return;
        if (drag.moved) {
            wasDragged = true;
            persistFabPosition(fab);
        }
        drag = null;
    };
    fab.addEventListener('pointerup', endDrag);
    fab.addEventListener('pointercancel', endDrag);

    return { isDragged: () => wasDragged, reset: () => { wasDragged = false; } };
}

function syncFabVisibility(fab) {
    const show = cachedState ? cachedState.showFloatingButton !== false : true;
    fab.style.display = show ? 'flex' : 'none';
}

function injectFloatingButton() {
    if (!isCervello()) return;
    if (document.getElementById(CV_FAB_ID)) return;

    const fab = document.createElement('button');
    fab.id = CV_FAB_ID;
    fab.title = 'M - Inserir Assinatura';
    fab.setAttribute('aria-label', 'Inserir Assinatura');
    fab.innerHTML = M_ICON_SVG;
    fab.style.cssText = `
        position: fixed; right: 24px; bottom: 24px; z-index: 2147483647;
        width: 52px; height: 52px; border-radius: 50%; border: none; cursor: grab;
        background: #0A3A5C; color: #FFFFFF; display: flex; align-items: center;
        justify-content: center; box-shadow: 0 8px 24px rgba(9, 30, 66, 0.35);
        transition: transform 0.15s, box-shadow 0.15s; touch-action: none;
        user-select: none; -webkit-user-select: none;
    `;
    fab.onmouseover = () => { fab.style.transform = 'scale(1.08)'; fab.style.boxShadow = '0 10px 28px rgba(9, 30, 66, 0.45)'; };
    fab.onmouseout = () => { fab.style.transform = 'scale(1)'; fab.style.boxShadow = '0 8px 24px rgba(9, 30, 66, 0.35)'; };

    const ctrl = createProfileMenu({
        trigger: fab,
        menuId: CV_MENU_ID,
        useExecCommand: false,
        resolveEditor: resolveTargetEditor
    });
    const draggable = makeFabDraggable(fab);

    fab.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggable.isDragged()) {
            draggable.reset();
            return;
        }
        ctrl.open();
    });

    applyFabPosition(fab);
    document.body.appendChild(fab);
    syncFabVisibility(fab);

    // Preferências podem mudar enquanto a página está aberta.
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes[STORAGE_KEY]) {
            cachedState = normalizeState(changes[STORAGE_KEY].newValue);
            syncFabVisibility(fab);
            applyFabPosition(fab);
        }
    });
}

if (isCervello()) {
    injectFloatingButton();

    // Garantia: o body pode não estar disponível se a injeção rodar cedo demais.
    setTimeout(() => {
        if (!document.getElementById(CV_FAB_ID)) injectFloatingButton();
    }, 1000);
}