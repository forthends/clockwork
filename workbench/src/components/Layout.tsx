import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-brand">
          <h1>Clockwork</h1>
          <span className="subtitle">Governance</span>
        </div>
        <ul className="nav-links">
          <li>
            <Link to="/tasks" className={isActive('/tasks') ? 'active' : ''}>
              Tasks
            </Link>
          </li>
          <li>
            <Link to="/knowledge" className={isActive('/knowledge') ? 'active' : ''}>
              Knowledge
            </Link>
          </li>
        </ul>
      </nav>
      <main className="content">
        {children}
      </main>
    </div>
  );
}
