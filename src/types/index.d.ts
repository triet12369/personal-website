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
};

export type BlogPost = {
  slug: string;
  frontmatter: BlogPostFrontmatter;
};
