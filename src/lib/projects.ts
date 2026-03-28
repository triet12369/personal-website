import fs from 'fs';
import path from 'path';

import matter from 'gray-matter';

import { Project, ProjectFrontmatter } from '../types';
import { resolveContentImage } from './resolveContentImage';

const PROJECTS_DIR = path.join(process.cwd(), 'src/content/projects');

export function getAllProjects(): Project[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  const slugs = entries
    .filter(
      (e) => e.isDirectory() && fs.existsSync(path.join(PROJECTS_DIR, e.name, 'index.mdx')),
    )
    .map((e) => e.name);

  return slugs
    .map((slug): Project => {
      const raw = fs.readFileSync(path.join(PROJECTS_DIR, slug, 'index.mdx'), 'utf-8');
      const { data } = matter(raw);
      const frontmatter = data as ProjectFrontmatter;

      const viPath = path.join(PROJECTS_DIR, slug, 'index.vi.mdx');
      let frontmatter_vi: ProjectFrontmatter | undefined;
      if (fs.existsSync(viPath)) {
        const viRaw = fs.readFileSync(viPath, 'utf-8');
        const { data: viData } = matter(viRaw);
        frontmatter_vi = viData as ProjectFrontmatter;
      }

      const imageUrl = resolveContentImage(path.join(PROJECTS_DIR, slug), frontmatter.image);

      return { slug, frontmatter, frontmatter_vi, ...(imageUrl && { imageUrl }) };
    })
    .sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title));
}

export function getProjectBySlug(slug: string): {
  frontmatter: ProjectFrontmatter;
  content: string;
  frontmatter_vi?: ProjectFrontmatter;
  content_vi?: string;
} {
  const raw = fs.readFileSync(path.join(PROJECTS_DIR, slug, 'index.mdx'), 'utf-8');
  const { data, content } = matter(raw);
  const frontmatter = data as ProjectFrontmatter;

  const viPath = path.join(PROJECTS_DIR, slug, 'index.vi.mdx');
  if (fs.existsSync(viPath)) {
    const viRaw = fs.readFileSync(viPath, 'utf-8');
    const { data: viData, content: content_vi } = matter(viRaw);
    const frontmatter_vi = viData as ProjectFrontmatter;
    return { frontmatter, content, frontmatter_vi, content_vi };
  }

  return { frontmatter, content };
}
