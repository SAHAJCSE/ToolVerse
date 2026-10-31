// runDiscovery.js – command-line runner for the discovery automation
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runDiscovery } from './discover.js';

// ── Load .env from the aitoolhub project (one level up) ───────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../aitoolhub/aitoolhub/.env');

try {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
  console.log('✅ Loaded .env from:', envPath);
} catch (e) {
  console.warn('⚠️  Could not load .env file at', envPath, '– relying on shell env vars.');
}

// ── Resolve credentials ────────────────────────────────────────────────────────
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are in the .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Run discovery ──────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log('🔍 Starting discovery run...');
    const result = await runDiscovery({ supabase, env: process.env, fetchFn: fetch });
    console.log('✅ Discovery run completed:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('❌ Discovery failed:', e.message || e);
    process.exit(1);
  }
})();
