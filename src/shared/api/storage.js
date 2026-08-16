/**
 * Wrapper tipado para chrome.storage.local/sync.
 * Requer: constants e normalizer.
 */
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
    chrome.storage.sync.set({ [STORAGE_KEY]: normalizeState(state) }, () => {
        if (chrome.runtime.lastError) {
            if (onError) onError(chrome.runtime.lastError);
            return;
        }
        if (onDone) onDone();
    });
}

function removeLegacyState() {
    return new Promise((resolve) => {
        chrome.storage.local.remove([LEGACY_KEY], resolve);
    });
}

function loadStateFromStorage(callback) {
    chrome.storage.sync.get([STORAGE_KEY], (syncResult) => {
        chrome.storage.local.get([LEGACY_KEY], (localResult) => {
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