import { NavLink, Outlet } from 'react-router-dom';
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
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => 'app-nav__link' + (isActive ? ' is-active' : '')}
              >
                {item.label}
              </NavLink>
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
