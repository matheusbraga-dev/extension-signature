/**
 * Verificação de sintaxe (node --check) de todos os .js e validade do manifest.
 * Uso: npm run check  (ou: node scripts/check.js)
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function walk(dir) {
    const out = [];
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) out.push(...walk(full));
        else if (full.endsWith('.js')) out.push(full);
    }
    return out;
}

let failed = false;

const jsFiles = walk(path.join(ROOT, 'src'));
for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ['--check', path.relative(ROOT, file)], { encoding: 'utf8', cwd: ROOT });
    if (result.status !== 0) {
        failed = true;
        console.error(`FAIL ${file}`);
        console.error(result.stderr);
    }
}

try {
    JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
    console.log('manifest.json OK');
} catch (error) {
    failed = true;
    console.error('manifest.json INVALID:', error.message);
}

if (failed) process.exit(1);
console.log(`Syntax OK (${jsFiles.length} files)`);