import { lazy } from 'react';
import {
  UploadOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  DashboardOutlined,
} from '@ant-design/icons';

const MaterialPage = lazy(() => import('@/pages/material'));
const ScriptPage = lazy(() => import('@/pages/script'));
const CreationPage = lazy(() => import('@/pages/creation'));
const DashboardPage = lazy(() => import('@/pages/dashboard'));

export interface RouteConfig {
  path: string;
  name: string;
  icon: React.ReactNode;
  element: React.ReactNode;
}

const routes: RouteConfig[] = [
  {
    path: '/material',
    name: '素材管理',
    icon: <UploadOutlined />,
    element: <MaterialPage />,
  },
  {
    path: '/script',
    name: '剧本生成',
    icon: <FileTextOutlined />,
    element: <ScriptPage />,
  },
  {
    path: '/creation',
    name: '视频创作',
    icon: <VideoCameraOutlined />,
    element: <CreationPage />,
  },
  {
    path: '/dashboard',
    name: '数据看板',
    icon: <DashboardOutlined />,
    element: <DashboardPage />,
  },
];

export const menuRoutes = routes;
export default routes;
