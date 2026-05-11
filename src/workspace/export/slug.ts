const FALLBACK = 'diagram';
const MAX_LENGTH = 64;

export function slugifyDiagramName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (cleaned.length === 0) return FALLBACK;
  return cleaned.slice(0, MAX_LENGTH).replace(/-+$/g, '') || FALLBACK;
}
