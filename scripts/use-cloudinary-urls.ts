// Swaps local /assets/… paths stored in the database (event content and tribe images) for the
// Cloudinary URLs written by upload-to-cloudinary.mjs. Safe to re-run: only exact local paths change.
// Usage: npx tsx scripts/use-cloudinary-urls.ts
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

const urls: Record<string, string> = JSON.parse(fs.readFileSync('scripts/cloudinary-urls.json', 'utf8'));
const db = new PrismaClient();

function swap(value: unknown): unknown {
  if (typeof value === 'string') return value in urls ? urls[value] : value;
  if (Array.isArray(value)) return value.map(swap);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, swap(v)]));
  return value;
}

async function main() {
  for (const event of await db.event.findMany()) {
    const content = swap(event.content);
    if (JSON.stringify(content) !== JSON.stringify(event.content)) {
      await db.event.update({ where: { id: event.id }, data: { content: content as object } });
      console.log(`Updated content for ${event.slug}`);
    }
  }
  for (const tribe of await db.tribe.findMany()) {
    if (tribe.image in urls) {
      await db.tribe.update({ where: { id: tribe.id }, data: { image: urls[tribe.image] } });
      console.log(`Updated image for tribe ${tribe.name}`);
    }
  }
}

main().finally(() => db.$disconnect());
