import fs from 'fs';
import path from 'path';

import matter from 'gray-matter';

import { BlogPost, BlogPostFrontmatter } from '../types';

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
      return { slug, frontmatter };
    })
    .sort(
      (a, b) =>
        new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime(),
    );
}

export function getPostBySlug(slug: string): {
  frontmatter: BlogPostFrontmatter;
  content: string;
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
  return { frontmatter, content };
}
