import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const poDir = path.join(rootDir, 'po');
const metadataPath = path.join(rootDir, 'resources', 'metadata.json');

const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const gettextDomain = metadata['gettext-domain'] || metadata.uuid;

const targetBases = [path.join(rootDir, 'dist', 'locale')];

if (!fs.existsSync(poDir)) {
  console.log('No po directory found, skipping locale build.');
  process.exit(0);
}

const poFiles = fs.readdirSync(poDir).filter((file) => file.endsWith('.po'));

if (poFiles.length === 0) {
  console.log('No .po translation files found.');
  process.exit(0);
}

for (const targetBase of targetBases) {
  for (const poFile of poFiles) {
    const locale = path.basename(poFile, '.po');
    const outDir = path.join(targetBase, locale, 'LC_MESSAGES');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `${gettextDomain}.mo`);
    const fullPoPath = path.join(poDir, poFile);

    try {
      execSync(`msgfmt -o "${outFile}" "${fullPoPath}"`, { stdio: 'inherit' });
      console.log(`Compiled translation: ${poFile} -> ${path.relative(rootDir, outFile)}`);
    } catch (err) {
      console.error(`Failed to compile ${poFile}:`, err);
      process.exit(1);
    }
  }
}
