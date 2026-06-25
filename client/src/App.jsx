import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Capture from './pages/Capture.jsx';
import LeadWorkspace from './pages/LeadWorkspace.jsx';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';

// Heavy / less-frequent screens are code-split so the initial bundle stays
// lean (Reports pulls in Recharts).
const Reports = lazy(() => import('./pages/Reports.jsx'));
const FlowMap = lazy(() => import('./pages/FlowMap.jsx'));
const Automation = lazy(() => import('./pages/Automation.jsx'));
const Landing = lazy(() => import('./pages/Landing.jsx'));

const Loading = () => <div className="spinner" style={{ padding: '4rem' }}>Loading…</div>;

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<Suspense fallback={<Loading />}><Landing /></Suspense>} />
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/capture" element={<Capture />} />
        <Route path="/leads/:id" element={<LeadWorkspace />} />
        <Route path="/reports" element={<Suspense fallback={<Loading />}><Reports /></Suspense>} />
        <Route path="/flow" element={<Suspense fallback={<Loading />}><FlowMap /></Suspense>} />
        <Route path="/automation" element={<Suspense fallback={<Loading />}><Automation /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
