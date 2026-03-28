import fs from 'fs';
import path from 'path';

import matter from 'gray-matter';

import { BlogPost, BlogPostFrontmatter } from '../types';
import { resolveContentImage } from './resolveContentImage';

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');

export function getAllPosts(): BlogPost[] {
  const entries = fs.readdirSync(BLOG_DIR, { withFileTypes: true });
  const slugs = entries
    .filter(
      (e) => e.isDirectory() && fs.existsSync(path.join(BLOG_DIR, e.name, 'index.mdx')),
    )
    .map((e) => e.name);

  return slugs
    .map((slug): BlogPost => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, slug, 'index.mdx'), 'utf-8');
      const { data } = matter(raw);
      const frontmatter: BlogPostFrontmatter = {
        ...(data as BlogPostFrontmatter),
        date:
          data.date instanceof Date
            ? data.date.toISOString().slice(0, 10)
            : String(data.date),
      };
      const viPath = path.join(BLOG_DIR, slug, 'index.vi.mdx');
      let frontmatter_vi: BlogPostFrontmatter | undefined;
      if (fs.existsSync(viPath)) {
        const viRaw = fs.readFileSync(viPath, 'utf-8');
        const { data: viData } = matter(viRaw);
        frontmatter_vi = {
          ...(viData as BlogPostFrontmatter),
          date:
            viData.date instanceof Date
              ? viData.date.toISOString().slice(0, 10)
              : String(viData.date),
        };
      }
      const imageUrl = resolveContentImage(path.join(BLOG_DIR, slug), frontmatter.image);
      return { slug, frontmatter, frontmatter_vi, ...(imageUrl && { imageUrl }) };
    })
    .sort(
      (a, b) =>
        new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime(),
    );
}

export function getPostBySlug(slug: string): {
  frontmatter: BlogPostFrontmatter;
  content: string;
  frontmatter_vi?: BlogPostFrontmatter;
  content_vi?: string;
} {
  const raw = fs.readFileSync(path.join(BLOG_DIR, slug, 'index.mdx'), 'utf-8');
  const { data, content } = matter(raw);
  const frontmatter: BlogPostFrontmatter = {
    ...(data as BlogPostFrontmatter),
    date:
      data.date instanceof Date
        ? data.date.toISOString().slice(0, 10)
        : String(data.date),
  };
  const viPath = path.join(BLOG_DIR, slug, 'index.vi.mdx');
  if (fs.existsSync(viPath)) {
    const viRaw = fs.readFileSync(viPath, 'utf-8');
    const { data: viData, content: content_vi } = matter(viRaw);
    const frontmatter_vi: BlogPostFrontmatter = {
      ...(viData as BlogPostFrontmatter),
      date:
        viData.date instanceof Date
          ? viData.date.toISOString().slice(0, 10)
          : String(viData.date),
    };
    return { frontmatter, content, frontmatter_vi, content_vi };
  }
  return { frontmatter, content };
}
