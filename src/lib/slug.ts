// Readable addresses: /races/2009-italian-grand-prix
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const raceSlug = (year: number, name: string) => `${year}-${slugify(name)}`;
