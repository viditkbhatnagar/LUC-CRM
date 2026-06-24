import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

// App shell: persistent sidebar + routed content (each page renders its own Topbar).
export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
