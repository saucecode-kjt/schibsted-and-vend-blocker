import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BUILD_DIR = path.join(ROOT, 'build');
const ICONS_DIR = path.join(ROOT, 'public', 'icons');
const RULES_DIR = path.join(ROOT, 'rules');
const MANIFEST_DIR = path.join(ROOT, 'manifest');
const TARGETS = ['chrome', 'firefox'];

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function buildManifest(target) {
  const base = readJson(path.join(MANIFEST_DIR, 'base.json'));
  const overridePath = path.join(MANIFEST_DIR, `${target}.json`);
  const override = existsSync(overridePath) ? readJson(overridePath) : {};
  return { ...base, ...override };
}

export function packageExtension(targets = TARGETS) {
  for (const target of targets) {
    const outDir = path.join(ROOT, 'dist', target);
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    cpSync(path.join(BUILD_DIR, 'content-scripts'), path.join(outDir, 'content-scripts'), { recursive: true });
    cpSync(ICONS_DIR, path.join(outDir, 'icons'), { recursive: true });
    cpSync(RULES_DIR, path.join(outDir, 'rules'), { recursive: true });

    const manifest = buildManifest(target);
    writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  return targets;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const requested = process.argv.slice(2).filter((arg) => TARGETS.includes(arg));
  const targets = requested.length ? requested : TARGETS;
  packageExtension(targets);
  console.log(`Packaged: ${targets.join(', ')}`);
}
