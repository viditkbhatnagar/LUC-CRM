import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Capture from './pages/Capture.jsx';
import LeadWorkspace from './pages/LeadWorkspace.jsx';
import Placeholder from './pages/Placeholder.jsx';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';

// Auth-guarded app shell. Reports (M6) and Flow/Automation (M7) render
// placeholders until those milestones land — no dead-end routes.
export default function App() {
  return (
    <Routes>
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
        <Route path="/reports" element={<Placeholder title="Dashboards" milestone="M6" />} />
        <Route path="/flow" element={<Placeholder title="Flow Map" milestone="M7" />} />
        <Route path="/automation" element={<Placeholder title="Automation Matrix" milestone="M7" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
