export const CACHE_KEYS = {
  NOTES_ALL: (sort?: string, page?: number) =>
    `notes:${sort || 'latest'}:${page || 1}`,
  NOTES_TRENDING: 'notes:trending',
  NOTES_MY: (userId: number, page?: number) =>
    `notes:my:${userId}:${page || 1}`,
  NOTES_ONE: (id: number) => `notes:${id}`,

  RESOURCES_ALL: (page?: number) =>
    `resources:${page || 1}`,
  RESOURCES_COURSES: (page?: number) =>
    `resources:courses:${page || 1}`,
  RESOURCES_TRENDING: 'resources:trending',
  RESOURCES_ONE: (id: number) => `resources:${id}`,

  LEADERBOARD: (period: string) => `leaderboard:${period}`,

  ADMIN_STATS: 'admin:stats',
  ADMIN_ACTIVE_USERS: (date: string) => `admin:active:${date}`,
  ADMIN_TOP_USERS: (date: string) => `admin:top:${date}`,
  ADMIN_REPORTS: (filter?: string) => `admin:reports:${filter || 'all'}`,
  ADMIN_SETTING: (key: string) => `admin:setting:${key}`,

  ANALYTICS: {
    USERS: (range: string) => `analytics:users:${range}`,
    ACTIVITY: (range: string) => `analytics:activity:${range}`,
    CONTENT: (range: string) => `analytics:content:${range}`,
  },
} as const;
