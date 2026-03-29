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
      comments: {
        heading: 'Comments',
        loading: 'Loading comments…',
        empty: 'No comments yet. Be the first!',
        postComment: 'Post comment',
        postReply: 'Post reply',
        posting: 'Posting…',
        cancel: 'Cancel',
        reply: 'Reply',
        delete: 'Delete',
        deleteComment: 'Delete comment',
        save: 'Save',
        saving: 'Saving…',
        editName: 'Edit name',
        owner: '(Owner)',
        previouslyKnownAs: 'Previously known as:',
        namePlaceholder: 'Your name',
        commentPlaceholder: 'Leave a comment…',
        failedPost: 'Failed to post comment',
        failedUpdateName: 'Failed to update name',
        failedDelete: 'Failed to delete',
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
      comments: {
        heading: 'Bình luận',
        loading: 'Đang tải bình luận…',
        empty: 'Chưa có bình luận. Hãy là người đầu tiên!',
        postComment: 'Đăng bình luận',
        postReply: 'Đăng trả lời',
        posting: 'Đang đăng…',
        cancel: 'Hủy',
        reply: 'Trả lời',
        delete: 'Xóa',
        deleteComment: 'Xóa bình luận',
        save: 'Lưu',
        saving: 'Đang lưu…',
        editName: 'Đổi tên',
        owner: '(Tác giả)',
        previouslyKnownAs: 'Trước đây biết đến với tên:',
        namePlaceholder: 'Tên của bạn',
        commentPlaceholder: 'Để lại bình luận…',
        failedPost: 'Không thể đăng bình luận',
        failedUpdateName: 'Không thể cập nhật tên',
        failedDelete: 'Không thể xóa',
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
