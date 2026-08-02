/**
 * Tests: search + vision-indexer integration.
 *
 * Covers:
 * 1. After analyzeImage returns labels, dbUpdateClothing is called with those
 *    labels, and searchItems subsequently finds the item by a matching label.
 * 2. searchOutfits returns an outfit when one of its items matches the query.
 * 3. An empty query returns no results from both searchItems and searchOutfits.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchItems, searchOutfits } from '@/lib/search';
import type { ClothingItem, SavedOutfit } from '@/types/local';

// ── Top-level module mocks (hoisted by Vitest before any imports) ─────────────

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
  registerPlugin: () => ({}),
}));

vi.mock('@/lib/db', () => ({
  dbGetClothing:    vi.fn(),
  dbListClothing:   vi.fn().mockResolvedValue([]),
  dbUpdateClothing: vi.fn(),
}));

vi.mock('@/lib/visionAnalyzer', () => ({
  analyzeImage: vi.fn(),
}));

// ── Static imports that depend on the mocked modules ─────────────────────────

import { dbGetClothing, dbUpdateClothing } from '@/lib/db';
import { analyzeImage }                    from '@/lib/visionAnalyzer';
import { indexOne }                        from '@/hooks/useVisionIndexer';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<ClothingItem> = {}): ClothingItem {
  return {
    id:                    'item-1',
    name:                  'Test Pump',
    category:              'heels',        // no substring collision with common queries
    imageObjectPath:       'shoes/test.jpg',
    color:                 null,
    brand:                 null,
    size:                  null,
    season:                null,
    occasion:              null,
    purchasePrice:         null,
    purchaseDate:          null,
    notes:                 null,
    isFavorite:            false,
    photoCleaned:          false,
    visionLabels:          [],
    visionText:            [],
    visionVersion:         0,
    timesWorn:             0,
    lastWornDate:          null,
    previousLastWornDate:  null,
    createdAt:             '2024-01-01T00:00:00.000Z',
    updatedAt:             '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeOutfit(items: ClothingItem[], overrides: Partial<SavedOutfit> = {}): SavedOutfit {
  return {
    id:        'outfit-1',
    name:      'Test Look',
    notes:     null,
    items,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── 1. Vision indexer → search integration ────────────────────────────────────

describe('vision indexer → search integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dbGetClothing).mockReset();
    vi.mocked(dbUpdateClothing).mockReset();
    vi.mocked(analyzeImage).mockReset();
  });

  it('calls dbUpdateClothing with labels from analyzeImage, then searchItems finds the item by label', async () => {
    const returnedLabels = ['athletic', 'white sole', 'canvas'];

    const item = makeItem({ visionVersion: 0 });
    const updatedItem: ClothingItem = { ...item, visionLabels: returnedLabels, visionVersion: 3 };

    vi.mocked(dbGetClothing).mockResolvedValue(item);
    vi.mocked(analyzeImage).mockResolvedValue({ labels: returnedLabels, texts: [] });
    vi.mocked(dbUpdateClothing).mockResolvedValue(updatedItem);

    const ok = await indexOne(item.id);

    // analyzeImage was called for the item's image path.
    expect(analyzeImage).toHaveBeenCalledWith(item.imageObjectPath);

    // dbUpdateClothing received the labels returned by analyzeImage.
    expect(dbUpdateClothing).toHaveBeenCalledWith(
      item.id,
      expect.objectContaining({ visionLabels: returnedLabels }),
    );
    expect(ok).toBe(true);

    // The updated item (with visionLabels) is now findable via searchItems.
    const results = searchItems([updatedItem], 'athletic');
    expect(results).toHaveLength(1);
    expect(results[0].item.id).toBe(item.id);
  });

  it('returns false and does not call dbUpdateClothing when analyzeImage throws', async () => {
    const item = makeItem({ visionVersion: 0 });
    vi.mocked(dbGetClothing).mockResolvedValue(item);
    vi.mocked(analyzeImage).mockRejectedValue(new Error('network error'));

    const ok = await indexOne(item.id);

    // Error is swallowed; visionVersion stays 0 (not persisted).
    expect(ok).toBe(false);
    expect(dbUpdateClothing).not.toHaveBeenCalled();
  });
});

// ── 2. searchItems — pure function tests ──────────────────────────────────────

describe('searchItems', () => {
  it('returns an item when its visionLabels match the query', () => {
    const item = makeItem({ visionLabels: ['canvas', 'white sole', 'athletic'] });
    const results = searchItems([item], 'canvas');
    expect(results).toHaveLength(1);
    expect(results[0].item.id).toBe('item-1');
  });

  it('returns an item when its name matches the query', () => {
    const item = makeItem({ name: 'Air Force 1' });
    const results = searchItems([item], 'air force');
    expect(results).toHaveLength(1);
  });

  it('scores name matches higher than visionLabel matches', () => {
    const byName  = makeItem({ id: 'a', name: 'canvas shoe',  visionLabels: [] });
    const byLabel = makeItem({ id: 'b', name: 'Other Shoe',   visionLabels: ['canvas'] });
    const results = searchItems([byLabel, byName], 'canvas');
    expect(results[0].item.id).toBe('a');
  });

  it('returns empty array when no items match', () => {
    // 'zebra' does not appear in any default field of makeItem (name=Test Pump, category=heels).
    const item = makeItem({ name: 'Red Heel', visionLabels: [] });
    expect(searchItems([item], 'zebra')).toHaveLength(0);
  });

  it('returns empty array for an empty query', () => {
    const item = makeItem({ name: 'Air Max', visionLabels: ['mesh'] });
    expect(searchItems([item], '')).toHaveLength(0);
    expect(searchItems([item], '   ')).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    const item = makeItem({ name: 'Adidas Stan Smith' });
    expect(searchItems([item], 'ADIDAS')).toHaveLength(1);
  });
});

// ── 3. searchOutfits — pure function tests ────────────────────────────────────

describe('searchOutfits', () => {
  it('returns an outfit when its name matches the query', () => {
    const outfit = makeOutfit([], { name: 'Summer Look' });
    const results = searchOutfits([outfit], 'summer', []);
    expect(results).toHaveLength(1);
    expect(results[0].outfit.id).toBe('outfit-1');
  });

  it('returns an outfit when one of its items matches via visionLabels', () => {
    const item   = makeItem({ id: 'i1', name: 'Plain Boot', visionLabels: ['leather', 'dark'] });
    const outfit = makeOutfit([item]);
    // allItems provides the fully-enriched item so label scoring works.
    const results = searchOutfits([outfit], 'leather', [item]);
    expect(results).toHaveLength(1);
  });

  it('returns an outfit when one of its items matches by name', () => {
    const item   = makeItem({ id: 'i2', name: 'Chelsea Boot' });
    const outfit = makeOutfit([item]);
    const results = searchOutfits([outfit], 'chelsea', [item]);
    expect(results).toHaveLength(1);
  });

  it('returns empty array for an empty query', () => {
    const item   = makeItem({ name: 'Pump', visionLabels: ['heel'] });
    const outfit = makeOutfit([item], { name: 'Evening Look' });
    expect(searchOutfits([outfit], '', [item])).toHaveLength(0);
    expect(searchOutfits([outfit], '  ', [item])).toHaveLength(0);
  });

  it('returns empty array when nothing matches', () => {
    const item   = makeItem({ name: 'Red Sneaker', visionLabels: [] });
    const outfit = makeOutfit([item], { name: 'Casual Look' });
    // 'zebra' matches none of the item or outfit fields.
    expect(searchOutfits([outfit], 'zebra', [item])).toHaveLength(0);
  });

  it('mirrors saved.tsx guard: empty query means isSearching is false and normal list is shown', () => {
    // saved.tsx: const isSearching = searchQuery.trim().length > 0
    // When isSearching is false, searchOutfits is never called and the full outfit
    // list is rendered instead of search results.
    const outfit = makeOutfit([], { name: 'Any Look' });
    const isSearching = ''.trim().length > 0;
    const outfitResults = isSearching ? searchOutfits([outfit], '', []) : [];
    expect(isSearching).toBe(false);
    expect(outfitResults).toHaveLength(0);
  });
});
