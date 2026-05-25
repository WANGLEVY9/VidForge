import { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import BasicLayout from './layouts/BasicLayout';
import routes from './routes';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import PrivacyConsent from './components/common/PrivacyConsent';
import { hasConsented, setConsentRecord } from './services/consent';
import type { ConsentSettings } from './services/consent';

function App() {
  const [consentVisible, setConsentVisible] = useState(false);

  useEffect(() => {
    if (!hasConsented()) {
      setConsentVisible(true);
    }
  }, []);

  const handleConsentAccept = (settings: ConsentSettings) => {
    setConsentRecord({
      version: 1,
      consented: true,
      settings,
      timestamp: new Date().toISOString(),
    });
    setConsentVisible(false);
  };

  const handleConsentDecline = () => {
    setConsentRecord({
      version: 1,
      consented: false,
      settings: {
        analytics: false,
        drafts: false,
        logging: false,
      },
      timestamp: new Date().toISOString(),
    });
    setConsentVisible(false);
  };

  return (
    <ErrorBoundary>
      <PrivacyConsent
        visible={consentVisible}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />
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
                <ErrorBoundary>
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
                </ErrorBoundary>
              }
            />
          ))}
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
