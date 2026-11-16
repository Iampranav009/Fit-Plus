import fs from 'node:fs';
import path from 'node:path';

function toIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && '_seconds' in val) {
    return new Date((val as { _seconds: number })._seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

async function main() {
  console.log('🔄 Starting Data Transformation: Firestore JSON -> PostgreSQL Relational...');
  const inDir = path.resolve(process.cwd(), 'scripts/migration/export');
  const outDir = path.resolve(process.cwd(), 'scripts/migration/export/transformed');
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.existsSync(inDir) ? fs.readdirSync(inDir).filter((f) => f.endsWith('.json') && !f.includes('manifest')) : [];

  for (const file of files) {
    const collName = file.replace('.json', '');
    const rawData = JSON.parse(fs.readFileSync(path.join(inDir, file), 'utf8')) as Array<Record<string, unknown>>;
    const transformed: Array<Record<string, unknown>> = [];

    for (const doc of rawData) {
      const row: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(doc)) {
        if (k === '_id') {
          row.id = v;
        } else if (k.endsWith('At') || k === 'createdAt' || k === 'updatedAt') {
          const snake = k.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
          row[snake] = toIso(v);
        } else {
          const snake = k.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
          row[snake] = v;
        }
      }
      transformed.push(row);
    }

    fs.writeFileSync(path.join(outDir, `${collName}.json`), JSON.stringify(transformed, null, 2));
    console.log(`✅ Transformed ${collName}: ${transformed.length} rows`);
  }

  console.log('🎉 Data transformation completed successfully.');
}

main().catch((err) => {
  console.error('Fatal transformation error:', err);
  process.exit(1);
});
