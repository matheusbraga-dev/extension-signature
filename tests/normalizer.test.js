/**
 * Testes unitários para `src/shared/utils/normalizer.js` e `constants.js`.
 * Carrega os dois módulos no contexto global via vm (são scripts, não módulos).
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const load = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

vm.runInThisContext(load('src/shared/constants.js'), { filename: 'constants.js' });
vm.runInThisContext(load('src/shared/utils/normalizer.js'), { filename: 'normalizer.js' });

const {
    normalizeSiteEntry,
    normalizeAllowedSites,
    normalizePlaceholders,
    normalizeProfile,
    normalizeState,
    createDefaultState,
    isAllowedUrl,
    stateFromStorage
} = globalThis;

// `const` declarado via vm não vira propriedade de globalThis; derivamos os
// valores padrão a partir das próprias funções.
const DEFAULT_SITES = createDefaultState().allowedSites;
const STORAGE_KEY = 'signatureStateV2';

test('normalizeSiteEntry normaliza protocolo, www e subdomínio curinga', () => {
    assert.strictEqual(normalizeSiteEntry('  HTTPS://WWW.Exemplo.COM.BR/foo '), 'exemplo.com.br');
    assert.strictEqual(normalizeSiteEntry('*.sub.dominio.com'), 'sub.dominio.com');
    assert.strictEqual(normalizeSiteEntry('jira.empresa.com'), 'jira.empresa.com');
});

test('normalizeSiteEntry rejeita entradas inválidas', () => {
    assert.strictEqual(normalizeSiteEntry(''), null);
    assert.strictEqual(normalizeSiteEntry('   '), null);
    assert.strictEqual(normalizeSiteEntry('sem-ponto'), null);
    assert.strictEqual(normalizeSiteEntry('foo bar'), null);
});

test('normalizeAllowedSites deduplica e usa defaults quando vazio', () => {
    const list = normalizeAllowedSites(['atlassian.net', 'ATLASSIAN.NET', 'mail.google.com'], DEFAULT_SITES);
    assert.deepStrictEqual(list, ['atlassian.net', 'mail.google.com']);
    assert.deepStrictEqual(normalizeAllowedSites([], DEFAULT_SITES), DEFAULT_SITES);
});

test('isAllowedUrl cobre host exato e subdomínios', () => {
    const sites = ['atlassian.net', 'cervelloesm.com.br'];
    assert.ok(isAllowedUrl('https://meu.atlassian.net/browse/X-1', sites));
    assert.ok(isAllowedUrl('https://atlassian.net/', sites));
    assert.ok(isAllowedUrl('https://app.cervelloesm.com.br/foo', sites));
    assert.ok(!isAllowedUrl('https://cervello.com.br/', sites));
    assert.ok(!isAllowedUrl('https://evil-atlassian.net/', sites));
    assert.ok(!isAllowedUrl('', sites));
    assert.ok(!isAllowedUrl('not-a-url', sites));
});

test('normalizePlaceholders normaliza chaves e remove duplicadas', () => {
    const list = normalizePlaceholders([
        { key: '  Cargo  ', value: 'Analista' },
        { key: 'cargo', value: 'duplicada' },
        { key: 'telefone', value: '119999' }
    ]);
    assert.deepStrictEqual(list, [
        { key: 'Cargo', value: 'Analista' },
        { key: 'telefone', value: '119999' }
    ]);
});

test('normalizeProfile preenche id e nome quando ausentes', () => {
    assert.deepStrictEqual(normalizeProfile({ html: '<b>x</b>' }, 2), { id: 'profile-3', name: 'Perfil 3', html: '<b>x</b>' });
});

test('createDefaultState inclui showFloatingButton como true e o Cervello nos sites', () => {
    const state = createDefaultState();
    assert.strictEqual(state.showFloatingButton, true);
    assert.ok(state.allowedSites.includes('cervelloesm.com.br'));
});

test('normalizeState define showFloatingButton como false quando explícito', () => {
    const state = normalizeState({ profiles: [{ html: '' }], showFloatingButton: false });
    assert.strictEqual(state.showFloatingButton, false);
});

test('normalizeState preserva showFloatingButton quando ausente (default true)', () => {
    const state = normalizeState({ profiles: [{ html: '' }] });
    assert.strictEqual(state.showFloatingButton, true);
});

test('stateFromStorage lida com sync, legacy e vazio', () => {
    const fromSync = stateFromStorage({ [STORAGE_KEY]: { profiles: [{ html: 'x' }] } }, null);
    assert.strictEqual(fromSync.profiles[0].html, 'x');

    const fromLegacy = stateFromStorage({}, '<b>legado</b>');
    assert.strictEqual(fromLegacy.profiles[0].html, '<b>legado</b>');
    assert.strictEqual(fromLegacy.showFloatingButton, true);

    const empty = stateFromStorage({}, null);
    assert.deepStrictEqual(empty.profiles, [{ id: 'default', name: 'Padrão', html: '' }]);
});