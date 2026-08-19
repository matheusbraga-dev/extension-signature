/**
 * Normalização e validação de estado, domínios e URLs.
 * Requer: sanitize (opcional) e constants.
 */

function normalizeSiteEntry(rawSite) {
    const value = String(rawSite || '').trim().toLowerCase();
    if (!value) return null;

    const withoutProtocol = value.replace(/^https?:\/\//, '').split('/')[0];
    const host = withoutProtocol.replace(/^\*\./, '').replace(/^www\./, '');

    if (!/^[a-z0-9.-]+$/.test(host)) return null;
    if (!host.includes('.') && host !== 'localhost') return null;

    return host;
}

function normalizeAllowedSites(rawSites, defaults) {
    const seen = new Set();
    const list = [];

    (Array.isArray(rawSites) ? rawSites : defaults).forEach((site) => {
        const normalized = normalizeSiteEntry(site);
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        list.push(normalized);
    });

    return list.length ? list : [...(defaults || DEFAULT_ALLOWED_SITES)];
}

// Placeholders personalizados: lista de { key, value }. As chaves são
// case-insensitive e duplicadas são removidas.
function normalizePlaceholders(raw) {
    const seen = new Set();
    const list = [];

    (Array.isArray(raw) ? raw : []).forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        const key = String(entry.key || '').trim();
        if (!key) return;

        const normKey = key.toLowerCase();
        if (seen.has(normKey)) return;
        seen.add(normKey);

        list.push({ key, value: String(entry.value ?? '') });
    });

    return list;
}

function createDefaultState() {
    return {
        activeProfileId: 'default',
        profiles: [{ id: 'default', name: 'Padrão', html: '' }],
        allowedSites: [...DEFAULT_ALLOWED_SITES],
        placeholders: [],
        showFloatingButton: true
    };
}

function normalizeProfile(profile, index) {
    if (!profile || typeof profile !== 'object') return null;

    const id = typeof profile.id === 'string' && profile.id ? profile.id : `profile-${index + 1}`;
    const name = typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : `Perfil ${index + 1}`;
    const rawHtml = typeof profile.html === 'string' ? profile.html : '';

    // No Service Worker (background) não há `document`, então a sanitização
    // é aplicada apenas onde sanitizeSignatureHtml está disponível.
    const html = typeof sanitizeSignatureHtml === 'function' ? sanitizeSignatureHtml(rawHtml) : rawHtml;

    return { id, name, html };
}

function normalizeState(raw) {
    const base = createDefaultState();
    if (!raw || typeof raw !== 'object') return base;

    const profiles = (Array.isArray(raw.profiles) ? raw.profiles : [])
        .map(normalizeProfile)
        .filter(Boolean);

    if (!profiles.length) return base;

    const ids = new Set(profiles.map((profile) => profile.id));
    const activeProfileId = ids.has(raw.activeProfileId) ? raw.activeProfileId : profiles[0].id;
    const allowedSites = normalizeAllowedSites(raw.allowedSites, DEFAULT_ALLOWED_SITES);
    const placeholders = normalizePlaceholders(raw.placeholders);
    const showFloatingButton = raw.showFloatingButton !== false;

    return { activeProfileId, profiles, allowedSites, placeholders, showFloatingButton };
}

function stateFromStorage(syncObj, legacyHtml) {
    if (syncObj && syncObj[STORAGE_KEY]) return normalizeState(syncObj[STORAGE_KEY]);

    if (legacyHtml) {
        return {
            activeProfileId: 'default',
            profiles: [{
                id: 'default',
                name: 'Padrão',
                html: typeof sanitizeSignatureHtml === 'function' ? sanitizeSignatureHtml(legacyHtml) : legacyHtml
            }],
            allowedSites: [...DEFAULT_ALLOWED_SITES],
            placeholders: [],
            showFloatingButton: true
        };
    }

    return createDefaultState();
}

function isAllowedUrl(url, allowedSites) {
    if (!url) return false;

    let hostname;
    try {
        hostname = new URL(url).hostname.toLowerCase();
    } catch (_error) {
        return false;
    }

    return allowedSites.some((site) => hostname === site || hostname.endsWith(`.${site}`));
}