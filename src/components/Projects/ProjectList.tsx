import Link from 'next/link';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useLanguage } from '../../hooks/useLanguage';
import { Project } from '../../types';
import { PROJECT_CLICK_HANDLERS } from './registry';

import styles from './ProjectList.module.scss';

type ProjectListProps = {
  projects: Project[];
};

export const ProjectList: React.FC<ProjectListProps> = ({ projects }) => {
  const { lang } = useLanguage();
  const { t } = useTranslation();

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
                  {fm.title}
                </button>
              ) : (
                <Link href={href} passHref>
                  <a
                    className={styles.title}
                    {...(isExternal
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                  >
                    {fm.title}
                  </a>
                </Link>
              )}
              {fm.description && <p className={styles.description}>{fm.description}</p>}
              {fm.techStack && fm.techStack.length > 0 && (
                <ul className={styles.tags}>
                  {fm.techStack.map((tech) => (
                    <li key={tech} className={styles.tag}>
                      {tech}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
