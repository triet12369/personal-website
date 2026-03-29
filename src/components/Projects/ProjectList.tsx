import Link from 'next/link';
import React from 'react';

import { ViewCount } from '../Engagement/ViewCount';
import { useLanguage } from '../../hooks/useLanguage';
import { useT } from '../../hooks/useT';
import { Project } from '../../types';
import { PROJECT_CLICK_HANDLERS } from './registry';

import styles from './ProjectList.module.scss';

type ProjectListProps = {
  projects: Project[];
};

export const ProjectList: React.FC<ProjectListProps> = ({ projects }) => {
  const { lang } = useLanguage();
  const t = useT();

  if (projects.length === 0) {
    return <p className={styles.empty}>{t('projects.noProjectsYet')}</p>;
  }

  return (
    <ul className={styles.list}>
      {projects.map((project) => {
        const fm =
          lang === 'vi' && project.frontmatter_vi
            ? project.frontmatter_vi
            : project.frontmatter;
        const href = project.frontmatter.href ?? `/projects/${project.slug}`;
        const isExternal = !!project.frontmatter.href;
        const clickHandler = PROJECT_CLICK_HANDLERS[project.slug];

        return (
          <li key={project.slug} className={styles.item}>
            {project.imageUrl && (
              <div className={styles.imageWrapper}>
                <img src={project.imageUrl} alt={fm.title} className={styles.image} />
              </div>
            )}
            <div className={styles.content}>
              {clickHandler ? (
                <button
                  className={styles.titleButton}
                  onClick={() => clickHandler(project)}
                >
                  {t({ en: project.frontmatter.title, vi: project.frontmatter_vi?.title ?? project.frontmatter.title })}
                </button>
              ) : (
                <Link href={href} passHref>
                  <a
                    className={styles.title}
                    {...(isExternal
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                  >
                    {t({ en: project.frontmatter.title, vi: project.frontmatter_vi?.title ?? project.frontmatter.title })}
                  </a>
                </Link>
              )}
              {(project.frontmatter.description || project.frontmatter_vi?.description) && (
                <p className={styles.description}>
                  {t({ en: project.frontmatter.description, vi: project.frontmatter_vi?.description ?? project.frontmatter.description })}
                </p>
              )}
              {fm.techStack && fm.techStack.length > 0 && (
                <ul className={styles.tags}>
                  {fm.techStack.map((tech) => (
                    <li key={tech} className={styles.tag}>
                      {tech}
                    </li>
                  ))}
                </ul>
              )}
              {!isExternal && <ViewCount slug={project.slug} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
