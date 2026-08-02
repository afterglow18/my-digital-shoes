/**
 * search.ts — client-side full-text search across items and outfits.
 *
 * Searches all stored text fields plus Apple Vision labels/text.
 * Returns de-duplicated results sorted by relevance score.
 */
import type { ClothingItem, SavedOutfit } from '@/types/local';

function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().trim();
}

function hit(value: string | null | undefined, q: string): boolean {
  if (!value) return false;
  return norm(value).includes(q);
}

function hitArray(arr: string[] | undefined, q: string): boolean {
  return (arr ?? []).some((v) => norm(v).includes(q));
}

export interface ItemSearchResult {
  item: ClothingItem;
  score: number;
}

export interface OutfitSearchResult {
  outfit: SavedOutfit;
  score: number;
}

export function searchItems(
  items: ClothingItem[],
  rawQuery: string,
): ItemSearchResult[] {
  const q = norm(rawQuery);
  if (!q) return [];

  const out: ItemSearchResult[] = [];
  for (const item of items) {
    let score = 0;
    if (hit(item.name, q))                    score += 10;
    if (hit(item.brand, q))                   score += 8;
    if (hit(item.color, q))                   score += 7;
    if (hit(item.category, q))                score += 6;
    if (hit(item.notes, q))                   score += 5;
    if (hit(item.size, q))                    score += 4;
    if (hit(item.season, q))                  score += 3;
    if (hit(item.occasion, q))                score += 3;
    if (hit(item.purchasePrice, q))           score += 2;
    if (hitArray(item.visionLabels, q))       score += 2;
    if (hitArray(item.visionText, q))         score += 2;
    if (score > 0) out.push({ item, score });
  }
  return out.sort((a, b) => b.score - a.score);
}

export function searchOutfits(
  outfits: SavedOutfit[],
  rawQuery: string,
  allItems: ClothingItem[],
): OutfitSearchResult[] {
  const q = norm(rawQuery);
  if (!q) return [];

  const itemMap = new Map(allItems.map((i) => [i.id, i]));
  const out: OutfitSearchResult[] = [];

  for (const outfit of outfits) {
    let score = 0;
    if (hit(outfit.name, q))  score += 10;
    if (hit(outfit.notes, q)) score += 5;

    for (const item of outfit.items ?? []) {
      const full = itemMap.get(item.id) ?? item;
      if (hit(full.name, q))                    score += 3;
      if (hit(full.brand, q))                   score += 2;
      if (hit(full.color, q))                   score += 2;
      if (hit(full.category, q))                score += 1;
      if (hitArray(full.visionLabels, q))       score += 1;
      if (hitArray(full.visionText, q))         score += 1;
    }

    if (score > 0) out.push({ outfit, score });
  }
  return out.sort((a, b) => b.score - a.score);
}
