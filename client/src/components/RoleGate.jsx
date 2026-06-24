import { useAuth } from '../context/AuthContext.jsx';

// Hides UI a user's role can't act on (server still enforces — UI only hides).
// Usage: <RoleGate roles={['team_lead','admin']}><ConfirmPayment/></RoleGate>
export default function RoleGate({ roles, children, fallback = null }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return fallback;
  return children;
}
