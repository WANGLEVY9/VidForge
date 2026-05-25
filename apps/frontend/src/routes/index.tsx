import { lazy, type ComponentType } from 'react';

const DashboardPage = lazy(() => import('@/pages/dashboard'));
const MaterialPage = lazy(() => import('@/pages/material'));
const ScriptPage = lazy(() => import('@/pages/script'));
const CreationPage = lazy(() => import('@/pages/creation'));
const AbComparePage = lazy(() => import('@/pages/ab-compare'));

export interface RouteConfig {
  path: string;
  name: string;
  element: React.LazyExoticComponent<ComponentType<any>>;
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
