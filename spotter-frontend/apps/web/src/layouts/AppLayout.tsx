import { Outlet } from '@tanstack/react-router';
import './AppLayout.css';

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/subscriptions', label: 'Subscriptions' },
];

function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <span className="app-header__brand">Spotter</span>
          <nav className="app-nav">
            {navItems.map((item) => (
              <a key={item.to} href={item.to} className="app-nav__link">
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
