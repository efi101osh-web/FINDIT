// Plain-English names for the codes the server sends ("WALLETS_AND_CARDS" -> "Wallets and cards").
// tests/labels.test.js checks that every code the backend can send has a label here.

export const REPORT_TYPE_LABELS = Object.freeze({ LOST: 'Lost', FOUND: 'Found' });

export const CATEGORY_LABELS = Object.freeze({
  ELECTRONICS: 'Electronics',
  BAGS: 'Bags',
  WALLETS_AND_CARDS: 'Wallets and cards',
  KEYS: 'Keys',
  CLOTHING: 'Clothing',
  ACCESSORIES: 'Accessories',
  DOCUMENTS: 'Documents',
  BOOKS_AND_STATIONERY: 'Books and stationery',
  SPORTS_EQUIPMENT: 'Sports equipment',
  OTHER: 'Other',
});

// An icon that stands in for the photo until the item has one (photos arrive in Stage 9).
export const CATEGORY_ICONS = Object.freeze({
  ELECTRONICS: 'headset-outline',
  BAGS: 'bag-handle-outline',
  WALLETS_AND_CARDS: 'card-outline',
  KEYS: 'key-outline',
  CLOTHING: 'shirt-outline',
  ACCESSORIES: 'watch-outline',
  DOCUMENTS: 'document-text-outline',
  BOOKS_AND_STATIONERY: 'book-outline',
  SPORTS_EQUIPMENT: 'basketball-outline',
  OTHER: 'cube-outline',
});

export const COLOUR_LABELS = Object.freeze({
  BLACK: 'Black', WHITE: 'White', GREY: 'Grey', SILVER: 'Silver', RED: 'Red', ORANGE: 'Orange', YELLOW: 'Yellow',
  GREEN: 'Green', BLUE: 'Blue', PURPLE: 'Purple', PINK: 'Pink', BROWN: 'Brown', BEIGE: 'Beige', GOLD: 'Gold',
  MULTICOLOUR: 'Multicolour', OTHER: 'Other colour',
});

export const STATUS_LABELS = Object.freeze({
  OPEN: 'Open',
  POTENTIAL_MATCH: 'Possible match',
  UNDER_VERIFICATION: 'Under verification',
  APPROVED_FOR_RETURN: 'Approved for return',
  RETURNED: 'Returned',
  CLOSED: 'Closed',
});

/** Falls back to a tidied version of the code, so an unexpected code never shows as blank. */
export function labelFor(map, code) {
  if (code in map) return map[code];
  return String(code || '').toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
