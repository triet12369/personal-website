import fs from 'fs';
import path from 'path';

const COVER_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

const CONTENT_ROOT = path.join(process.cwd(), 'src/content');
const PUBLIC_ROOT = path.join(process.cwd(), 'public');

/**
 * Copies a colocated image to public/content/<subPath>/ at build time
 * and returns its public URL. Auto-detects cover.{png,jpg,jpeg,webp,gif}
 * when no filename is given.
 */
export function resolveContentImage(dir: string, filename?: string): string | undefined {
  const candidates = filename
    ? [filename]
    : COVER_EXTS.map((ext) => `cover.${ext}`);

  for (const candidate of candidates) {
    const srcPath = path.join(dir, candidate);
    if (fs.existsSync(srcPath)) {
      const subPath = path.relative(CONTENT_ROOT, dir).replace(/\\/g, '/');
      const destDir = path.join(PUBLIC_ROOT, 'content', subPath);
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(srcPath, path.join(destDir, candidate));
      return `/content/${subPath}/${candidate}`;
    }
  }
  return undefined;
}
