export interface UserNavigationItem {
  to: string
  icon: string
  label: string
  relatedPaths?: RegExp
}
export interface UserNavigationGroup {
  id: string
  icon: string
  label: string
  items: UserNavigationItem[]
}
export const userNavigationGroups: UserNavigationGroup[] = [
  {
    id: 'study', icon: 'bi-book', label: 'Học tập', items: [
      { to: '/user/my-courses', icon: 'bi-journals', label: 'Khóa học của tôi', relatedPaths: /^\/course\/(?:\d+(?:\/books)?|book\/\d+)\/?$/ },
      { to: '/user/learning-plan', icon: 'bi-signpost', label: 'Lộ trình của tôi' },
      { to: '/user/notebook', icon: 'bi-journal-bookmark', label: 'Sổ tay' },
      { to: '/user/english', icon: 'bi-translate', label: 'Tiếng Anh cá nhân' },
    ],
  },
  {
    id: 'practice', icon: 'bi-pencil-square', label: 'Luyện tập', items: [
      { to: '/user/assignments', icon: 'bi-clipboard-check', label: 'Bài được giao & thi', relatedPaths: /^\/user\/attempts\/\d+\/?$/ },
      { to: '/user/review', icon: 'bi-arrow-repeat', label: 'Ôn tập', relatedPaths: /^\/(?:users\/exercises\/history\/\d+|course\/lesson\/\d+\/exercises)\/?$/ },
      { to: '/user/conversation-listening', icon: 'bi-headphones', label: 'Luyện nghe hội thoại', relatedPaths: /^\/course\/\d+\/conversation-listening\/?$/ },
    ],
  },
  {
    id: 'commerce', icon: 'bi-bag-heart', label: 'Khóa học & thanh toán', items: [
      { to: '/courses', icon: 'bi-compass', label: 'Khám phá khóa học' },
      { to: '/wallet', icon: 'bi-wallet2', label: 'Ví của tôi' },
    ],
  },
]
export function navigationItemActive(item: UserNavigationItem, path: string) {
  return path.replace(/\/$/, '') === item.to || Boolean(item.relatedPaths?.test(path))
}
