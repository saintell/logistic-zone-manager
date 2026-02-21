// scripts/check-env.js
// Validates that required API keys exist in .env before building the installer.

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');

const REQUIRED_KEYS = ['GEMINI_API_KEY', 'GOOGLE_MAPS_API_KEY'];

if (!existsSync(envPath)) {
    console.error('\n❌  ERROR: No se encontró el archivo .env en la raíz del proyecto.');
    console.error('   Crea el archivo .env con las siguientes variables:\n');
    REQUIRED_KEYS.forEach((key) => console.error(`   ${key}=<tu_api_key>`));
    console.error('');
    process.exit(1);
}

const envContent = readFileSync(envPath, 'utf-8');

// Parse .env lines into a key→value map (ignores comments and blank lines)
const envVars = Object.fromEntries(
    envContent
        .split('\n')
        .filter((line) => line.trim() && !line.trim().startsWith('#'))
        .map((line) => {
            const [key, ...rest] = line.split('=');
            return [key.trim(), rest.join('=').trim()];
        })
);

const missing = REQUIRED_KEYS.filter((key) => !envVars[key] || envVars[key] === '');

if (missing.length > 0) {
    console.error('\n❌  ERROR: Faltan las siguientes API keys en el archivo .env:\n');
    missing.forEach((key) => console.error(`   • ${key}`));
    console.error('\n   El instalador NO se generará hasta que estén configuradas.\n');
    process.exit(1);
}

console.log('✅  Variables de entorno validadas correctamente. Iniciando build...\n');
