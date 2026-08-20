/**
 * Wrapper tipado para chrome.storage.local/sync.
 * Requer: constants e normalizer.
 *
 * O estado principal vive em chrome.storage.sync (sincroniza entre
 * dispositivos). Se o sync estourar a cota por item (8 KB), gravamos um
 * fallback em storage.local para nunca perder os dados do usuário.
 */
const LOCAL_FALLBACK_KEY = 'signatureStateV2Local';
let usingLocalFallback = false;

function isUsingLocalFallback() {
    return usingLocalFallback;
}

function getSyncState() {
    return new Promise((resolve) => {
        chrome.storage.sync.get([STORAGE_KEY], (result) => {
            resolve(result[STORAGE_KEY] ? normalizeState(result[STORAGE_KEY]) : null);
        });
    });
}

function getStateFromSync() {
    return new Promise((resolve) => {
        chrome.storage.sync.get([STORAGE_KEY], (result) => {
            resolve(normalizeState(result[STORAGE_KEY]));
        });
    });
}

function getLegacyState() {
    return new Promise((resolve) => {
        chrome.storage.local.get([LEGACY_KEY], (result) => {
            resolve(result[LEGACY_KEY] || '');
        });
    });
}

function writeSyncState(state) {
    return new Promise((resolve) => {
        chrome.storage.sync.set({ [STORAGE_KEY]: normalizeState(state) }, resolve);
    });
}

function saveState(state, onDone, onError) {
    const normalized = normalizeState(state);

    chrome.storage.sync.set({ [STORAGE_KEY]: normalized }, () => {
        if (!chrome.runtime.lastError) {
            // Sucesso no sync: o fallback local (se existia) não é mais necessário.
            chrome.storage.local.remove([LOCAL_FALLBACK_KEY], () => {});
            usingLocalFallback = false;
            if (onDone) onDone();
            return;
        }

        // Sync falhou (ex.: QUOTA_BYTES_PER_ITEM estourado). Grava no local para
        // não perder os dados e avisa via onDone. O erro original não é
        // propagado como onError porque a persistência foi preservada.
        chrome.storage.local.set({ [LOCAL_FALLBACK_KEY]: normalized }, () => {
            if (chrome.runtime.lastError) {
                if (onError) onError(chrome.runtime.lastError);
                return;
            }
            usingLocalFallback = true;
            if (onDone) onDone();
        });
    });
}

function removeLegacyState() {
    return new Promise((resolve) => {
        chrome.storage.local.remove([LEGACY_KEY], resolve);
    });
}

function loadStateFromStorage(callback) {
    chrome.storage.sync.get([STORAGE_KEY], (syncResult) => {
        chrome.storage.local.get([LOCAL_FALLBACK_KEY, LEGACY_KEY], (localResult) => {
            if (syncResult[STORAGE_KEY]) {
                usingLocalFallback = false;
                callback(stateFromStorage(syncResult, localResult[LEGACY_KEY]));
                return;
            }

            // Sem estado no sync: se existe fallback local, usa-o.
            if (localResult[LOCAL_FALLBACK_KEY]) {
                usingLocalFallback = true;
                callback(normalizeState(localResult[LOCAL_FALLBACK_KEY]));
                return;
            }

            usingLocalFallback = false;
            callback(stateFromStorage(syncResult, localResult[LEGACY_KEY]));
        });
    });
}

function readActionHistory(onDone) {
    chrome.storage.local.get([ACTION_HISTORY_KEY], (res) => {
        onDone(res[ACTION_HISTORY_KEY] || []);
    });
}

function clearActionHistory(onDone) {
    chrome.storage.local.set({ [ACTION_HISTORY_KEY]: [] }, onDone);
}