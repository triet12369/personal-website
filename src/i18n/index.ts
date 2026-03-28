import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      nav: {
        home: 'Home',
        blog: 'Blog',
        projects: 'Projects',
      },
      home: {
        pageTitle: 'Home',
        helloButton: 'Hello World',
        recentPosts: 'Recent Posts',
      },
      blog: {
        pageTitle: 'Blog',
        heading: 'Blog',
        noPostsYet: 'No posts yet.',
      },
      projects: {
        pageTitle: 'Projects',
        heading: 'Projects',
        noProjectsYet: 'No projects yet.',
      },
      layout: {
        footer: 'My footer',
      },
      theme: {
        activateDark: 'Activate dark mode',
        activateLight: 'Activate light mode',
      },
    },
  },
  vi: {
    translation: {
      nav: {
        home: 'Trang chủ',
        blog: 'Blog',
        projects: 'Dự án',
      },
      home: {
        pageTitle: 'Trang chủ',
        helloButton: 'Xin chào thế giới',
        recentPosts: 'Bài viết gần đây',
      },
      blog: {
        pageTitle: 'Blog',
        heading: 'Blog',
        noPostsYet: 'Chưa có bài viết.',
      },
      projects: {
        pageTitle: 'Dự án',
        heading: 'Các dự án',
        noProjectsYet: 'Chưa có dự án.',
      },
      layout: {
        footer: 'Footer của tôi',
      },
      theme: {
        activateDark: 'Tắt đèn',
        activateLight: 'Mở đèn',
      },
    },
  },
};

i18next.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources,
  interpolation: {
    escapeValue: false,
  },
});

export default i18next;
