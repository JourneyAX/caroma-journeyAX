import { DocumentType, DocumentMetadata } from './types';

// ── URL-based classification ───────────────────────────────────────────
const URL_PATTERNS: Array<{ pattern: RegExp; type: DocumentType; category?: string }> = [
  // Products by category
  { pattern: /\/basins?\//i, type: 'product', category: 'Basins' },
  { pattern: /\/toilets?|\/suites?\//i, type: 'product', category: 'Toilet Suites' },
  { pattern: /\/tapware\//i, type: 'product', category: 'Tapware' },
  { pattern: /\/showers?\//i, type: 'product', category: 'Showers' },
  { pattern: /\/baths?\//i, type: 'product', category: 'Baths' },
  { pattern: /\/accessories\//i, type: 'product', category: 'Accessories' },
  { pattern: /\/spare-parts?\//i, type: 'product', category: 'Spare Parts' },
  { pattern: /\/cisterns?\//i, type: 'product', category: 'Cisterns' },
  { pattern: /\/flush-plates?\//i, type: 'product', category: 'Flush Plates' },

  // Collections
  { pattern: /\/collections?\//i, type: 'collection' },
  { pattern: /urbane/i, type: 'collection' },
  { pattern: /liano/i, type: 'collection' },
  { pattern: /contura/i, type: 'collection' },
  { pattern: /luna/i, type: 'collection' },
  { pattern: /opal/i, type: 'collection' },

  // Design & Planning
  { pattern: /\/design[-_]?plan/i, type: 'design' },
  { pattern: /\/inspiration/i, type: 'design' },
  { pattern: /\/bathroom[-_]?design/i, type: 'design' },

  // Troubleshooting & Help
  { pattern: /\/help\//i, type: 'troubleshooting' },
  { pattern: /\/troubleshoot/i, type: 'troubleshooting' },
  { pattern: /\/support/i, type: 'troubleshooting' },
  { pattern: /\/faq/i, type: 'faq' },

  // Installation
  { pattern: /\/install/i, type: 'installation' },
  { pattern: /\/how[-_]?to/i, type: 'installation' },

  // PDFs
  { pattern: /\.pdf$/i, type: 'pdf' },
];

// ── Content-based classification ───────────────────────────────────────
const CONTENT_PATTERNS: Array<{ pattern: RegExp; type: DocumentType; category?: string }> = [
  // Product indicators
  { pattern: /\bSKU\b|\bproduct code\b|\bRRP\b|\$\d+/i, type: 'product' },
  { pattern: /\bWELS\b.*star|water rating/i, type: 'product' },
  { pattern: /\badd to cart\b|\bbuy now\b/i, type: 'product' },

  // Troubleshooting indicators
  { pattern: /\btroubleshoot/i, type: 'troubleshooting' },
  { pattern: /\bdiagnostic\b|\bsymptom\b|\bproblem\b.*\bsolution\b/i, type: 'troubleshooting' },
  { pattern: /\bleaking\b|\bdripping\b|\bblocked\b|\bnot flushing\b/i, type: 'troubleshooting' },
  { pattern: /\bstep\s*\d+\b.*\bcheck\b/i, type: 'troubleshooting' },

  // Installation indicators
  { pattern: /\binstallation\s*(guide|instructions?|manual)\b/i, type: 'installation' },
  { pattern: /\btools?\s*(required|needed)\b/i, type: 'installation' },
  { pattern: /\brough[-_]?in\b|\bplumbing\b/i, type: 'installation' },

  // FAQ indicators
  { pattern: /\bfrequently asked\b|\bfaq\b/i, type: 'faq' },
  { pattern: /\bQ:\s|A:\s/m, type: 'faq' },

  // Design indicators
  { pattern: /\bbathroom\s*(design|style|inspiration|layout)\b/i, type: 'design' },
  { pattern: /\bcollection\b.*\b(features?|range|includes?)\b/i, type: 'design' },
  { pattern: /\bbundle\b|\bpackage\b|\bsuite\b.*\bcomplete\b/i, type: 'design' },
];

/**
 * Classify a crawled page by its URL + content to determine document type.
 */
export function classifyPage(
  url: string,
  content: string,
  title: string
): { type: DocumentType; category?: string; collection?: string } {
  // 1. Try URL-based classification first (most reliable)
  for (const rule of URL_PATTERNS) {
    if (rule.pattern.test(url)) {
      return {
        type: rule.type,
        category: rule.category,
        collection: extractCollection(url, content),
      };
    }
  }

  // 2. Try content-based classification
  const contentSample = (title + ' ' + content.slice(0, 2000)).toLowerCase();
  for (const rule of CONTENT_PATTERNS) {
    if (rule.pattern.test(contentSample)) {
      return {
        type: rule.type,
        category: rule.category,
        collection: extractCollection(url, content),
      };
    }
  }

  // 3. Default to general
  return {
    type: 'general',
    collection: extractCollection(url, content),
  };
}

/**
 * Extract collection name from URL or content.
 */
function extractCollection(url: string, content: string): string | undefined {
  const collections = [
    'Urbane II', 'Urbane', 'Liano II', 'Liano',
    'Contura', 'Luna', 'Opal', 'Elvire',
    'Caroma Profile', 'GreenStar',
  ];

  const combined = url + ' ' + content.slice(0, 1000);
  for (const col of collections) {
    if (combined.toLowerCase().includes(col.toLowerCase())) {
      return col;
    }
  }
  return undefined;
}

/**
 * Classify an MD file from the GWA folder by its path and content.
 */
export function classifyMdFile(
  filePath: string,
  content: string
): { type: DocumentType; category?: string; collection?: string } {
  const path = filePath.toLowerCase();

  if (path.includes('trouble') || path.includes('diagnostic')) {
    return { type: 'troubleshooting', collection: extractCollection(filePath, content) };
  }
  if (path.includes('costbom') || path.includes('pricing') || path.includes('product')) {
    return { type: 'product', collection: extractCollection(filePath, content) };
  }
  if (path.includes('bathroom designer') || path.includes('bundle') || path.includes('collection')) {
    return { type: 'design', collection: extractCollection(filePath, content) };
  }
  if (path.includes('quote') || path.includes('customer_support') || path.includes('showroom')) {
    return { type: 'general', collection: extractCollection(filePath, content) };
  }

  // Fall back to content-based
  return classifyPage(filePath, content, '');
}

/**
 * Extract product metadata from content (price, SKU, images, finishes).
 */
export function extractProductMetadata(content: string): Partial<DocumentMetadata> {
  const result: Partial<DocumentMetadata> = {};

  // Extract price (AUD)
  const priceMatch = content.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
  if (priceMatch) {
    result.price = parseFloat(priceMatch[1].replace(',', ''));
    result.currency = 'AUD';
  }

  // Extract SKU
  const skuMatch = content.match(/\b(?:SKU|Product Code|Code)[:\s]*([A-Z0-9][\w-]{3,})/i);
  if (skuMatch) {
    result.sku = skuMatch[1];
  }

  // Extract image URLs
  const imageUrls: string[] = [];
  const imgRegex = /!\[.*?\]\((https?:\/\/[^\s)]+(?:\.(?:jpg|jpeg|png|webp|avif))[^\s)]*)\)/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(content)) !== null) {
    imageUrls.push(imgMatch[1]);
  }
  // Also check for CDN URLs
  const cdnRegex = /(https?:\/\/cdn\.[^\s"']+(?:\.(?:jpg|jpeg|png|webp|avif))[^\s"']*)/gi;
  while ((imgMatch = cdnRegex.exec(content)) !== null) {
    if (!imageUrls.includes(imgMatch[1])) {
      imageUrls.push(imgMatch[1]);
    }
  }
  if (imageUrls.length > 0) {
    result.images = imageUrls.slice(0, 5); // Keep top 5
  }

  // Extract finishes
  const finishKeywords = [
    'Matte Black', 'Chrome', 'Brushed Brass', 'Brushed Nickel',
    'Gunmetal', 'Brushed Bronze', 'White', 'Gloss White',
  ];
  const finishes = finishKeywords.filter(f =>
    content.toLowerCase().includes(f.toLowerCase())
  );
  if (finishes.length > 0) {
    result.finishes = finishes;
  }

  return result;
}
