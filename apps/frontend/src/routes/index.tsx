const DashboardPage = () => import('@/pages/dashboard');
const MaterialPage = () => import('@/pages/material');
const ScriptPage = () => import('@/pages/script');
const CreationPage = () => import('@/pages/creation');
const AbComparePage = () => import('@/pages/ab-compare');

export interface RouteConfig {
  path: string;
  name: string;
  element: () => Promise<typeof import('*.tsx')>;
}

const routes: RouteConfig[] = [
  {
    path: '/dashboard',
    name: '工作台',
    element: DashboardPage,
  },
  {
    path: '/material',
    name: '素材库',
    element: MaterialPage,
  },
  {
    path: '/script',
    name: '剧本创作',
    element: ScriptPage,
  },
  {
    path: '/creation',
    name: '视频创作',
    element: CreationPage,
  },
  {
    path: '/ab-compare',
    name: 'A/B 对比',
    element: AbComparePage,
  },
];

export default routes;
