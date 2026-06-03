import { PAGINATION } from './defaults';

export const CACHE_KEYS = {
  NOTES_ALL: (sort?: string, page?: number, limit?: number) =>
    `notes:${sort || 'latest'}:${page || PAGINATION.DEFAULT_PAGE}:${limit || PAGINATION.DEFAULT_LIMIT}`,
  NOTES_TRENDING: 'notes:trending',
  NOTES_MY: (uploaderId: number, page?: number, limit?: number) =>
    `notes:my:${uploaderId}:${page || PAGINATION.DEFAULT_PAGE}:${limit || PAGINATION.DEFAULT_LIMIT}`,
  NOTES_ONE: (id: number) => `notes:${id}`,
  NOTES_PATTERN: 'notes:*',

  RESOURCES_ALL: (page?: number, limit?: number) =>
    `resources:${page || PAGINATION.DEFAULT_PAGE}:${limit || PAGINATION.DEFAULT_LIMIT}`,
  RESOURCES_COURSES: (page?: number, limit?: number) =>
    `resources:courses:${page || PAGINATION.DEFAULT_PAGE}:${limit || PAGINATION.DEFAULT_LIMIT}`,
  RESOURCES_TRENDING: 'resources:trending',
  RESOURCES_ONE: (id: number) => `resources:${id}`,
  RESOURCES_PATTERN: 'resources:*',

  LEADERBOARD: (period: string) => `leaderboard:${period}`,
  LEADERBOARD_CURRENT: 'leaderboard:current',
  LEADERBOARD_PATTERN: 'leaderboard:*',

  ACTIVE_USERS: (userRole?: string, page?: number, take?: number) =>
    `activeUsers:${userRole || 'all'}:${page || PAGINATION.DEFAULT_PAGE}:${take || PAGINATION.DEFAULT_LIMIT}`,
  ACTIVE_USERS_PATTERN: 'activeUsers:*',

  USER_PROFILE: (id: number) => `user:profile:${id}`,

  SESSION: (userId: number, hashedToken: string) =>
    `session:${userId}:${hashedToken}`,
  SESSION_PATTERN: (userId: number) => `session:${userId}:*`,

  ADMIN_STATS: 'admin:stats',
  ADMIN_ACTIVE_USERS: 'admin:active-users',
  ADMIN_REPORT: 'admin:report',
  ADMIN_SETTING: (key: string) => `admin:setting:${key}`,
  ADMIN_PERMISSIONS: 'admin:permissions',

  ANALYTICS_OVERVIEW: (filter: string) => `analytics:overview:${filter}`,
  ANALYTICS_USERS: (range: string) => `analytics:users:${range}`,
  ANALYTICS_ACTIVITY: (range: string) => `analytics:activity:${range}`,
  ANALYTICS_CONTENT: (range: string) => `analytics:content:${range}`,
} as const;
