import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import BasicLayout from './layouts/BasicLayout';
import routes from './routes';

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<BasicLayout />}
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        {routes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <Suspense
                fallback={
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: 400,
                    }}
                  >
                    <Spin size="large" />
                  </div>
                }
              >
                <route.element />
              </Suspense>
            }
          />
        ))}
      </Route>
    </Routes>
  );
}

export default App;
