import * as fs from 'fs';
import * as path from 'path';
import { CrawledPage } from './types';

/**
 * Load all markdown files from the GWA directory.
 * Returns them as CrawledPage objects for uniform processing.
 */
export function loadMdFiles(gwaDir: string): CrawledPage[] {
  const pages: CrawledPage[] = [];

  function walkDir(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.trim().length < 50) continue; // Skip empty files

          const relativePath = path.relative(gwaDir, fullPath);
          const title = extractTitleFromFile(content, entry.name);

          pages.push({
            url: `file://${relativePath}`,
            title,
            markdown: content,
            metadata: {
              source: 'local-md',
              filePath: relativePath,
              folder: path.dirname(relativePath),
            },
          });
        } catch (err) {
          console.warn(`Failed to read ${fullPath}:`, err);
        }
      }
    }
  }

  walkDir(gwaDir);
  console.log(`📁 Loaded ${pages.length} MD files from ${gwaDir}`);
  return pages;
}

/**
 * Extract a meaningful title from MD file content or filename.
 */
function extractTitleFromFile(content: string, filename: string): string {
  // Try first heading
  const headingMatch = content.match(/^#{1,3}\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();

  // Fall back to filename (cleaned up)
  return filename
    .replace(/\.md$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
