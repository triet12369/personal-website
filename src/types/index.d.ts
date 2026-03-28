import { UrlObject } from 'url';

export type RouteItem = {
  label: string;
  href: UrlObject;
};

export type BlogPostFrontmatter = {
  title: string;
  date: string;
  description?: string;
  tags?: string[];
  href?: string;
  image?: string;
};

export type BlogPost = {
  slug: string;
  frontmatter: BlogPostFrontmatter;
  frontmatter_vi?: BlogPostFrontmatter;
  imageUrl?: string;
};

export type ProjectFrontmatter = {
  title: string;
  description: string;
  href?: string;
  techStack?: string[];
  image?: string;
};

export type Project = {
  slug: string;
  frontmatter: ProjectFrontmatter;
  frontmatter_vi?: ProjectFrontmatter;
  imageUrl?: string;
};
