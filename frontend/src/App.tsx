import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { TaskBoard } from './components/TaskBoard/TaskBoard';
import { SettingsPage } from './components/Settings/SettingsPage';

type Page = 'board' | 'settings';

export default function App() {
  const [page, setPage] = useState<Page>('board');

  return (
    <div className="app-shell">
      {/* Sidebar nav */}
      <nav className="app-nav">
        <div className="app-nav-brand">
          <span className="app-nav-logo">⚡</span>
          <span className="app-nav-name">Copilot Board</span>
        </div>
        <ul className="app-nav-links">
          <li>
            <button
              className={`app-nav-link ${page === 'board' ? 'active' : ''}`}
              onClick={() => setPage('board')}
            >
              📋 Board
            </button>
          </li>
          <li>
            <button
              className={`app-nav-link ${page === 'settings' ? 'active' : ''}`}
              onClick={() => setPage('settings')}
            >
              ⚙️ Settings
            </button>
          </li>
        </ul>
      </nav>

      {/* Main content */}
      <main className="app-main">
        {page === 'board' && <TaskBoard />}
        {page === 'settings' && <SettingsPage />}
      </main>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: 'var(--font-family)',
            fontSize: '14px',
          },
        }}
      />
    </div>
  );
}
