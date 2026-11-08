import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  FaHotel,
  FaHome,
  FaCalendarAlt,
  FaFileInvoiceDollar,
  FaUserCircle,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaBed,
  FaConciergeBell,
  FaStar
} from 'react-icons/fa';
import AlertContainer from './AlertContainer';
import { useAuth } from '../contexts/AuthContext';

const GuestLayout = () => {
  const { user, logout, isGuest } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { to: '/guest/dashboard', icon: <FaHome />, label: 'Dashboard' },
    { to: '/guest/bookings', icon: <FaCalendarAlt />, label: 'My Bookings' },
    { to: '/guest/billing', icon: <FaFileInvoiceDollar />, label: 'My Billing' },
    { to: '/guest/services', icon: <FaConciergeBell />, label: 'Services' },
    { to: '/guest/feedback', icon: <FaStar />, label: 'Feedback' },
    { to: '/guest/profile', icon: <FaUserCircle />, label: 'My Profile' }
  ];

  const pageTitles = {
    '/guest/dashboard': { title: 'Guest Dashboard', subtitle: 'Welcome back! Here\'s an overview of your stays.' },
    '/guest/bookings': { title: 'My Bookings', subtitle: 'Manage your reservations and book new stays.' },
    '/guest/billing': { title: 'My Billing', subtitle: 'View your invoices and payment history.' },
    '/guest/services': { title: 'Guest Services', subtitle: 'Request room service, spa, transport, and more.' },
    '/guest/feedback': { title: 'Feedback', subtitle: 'Share your experience and help us improve.' },
    '/guest/profile': { title: 'My Profile', subtitle: 'Update your personal information.' }
  };

  const pageInfo = pageTitles[location.pathname] || { title: '', subtitle: '' };

  return (
    <div className="guest-app-layout">
      <header className="guest-navbar">
        <div className="guest-navbar-inner">
          <Link to="/" className="guest-brand">
            <div className="guest-brand-logo-wrap">
              <FaHotel className="guest-brand-logo" />
            </div>
            <div className="guest-brand-text">
              <span className="guest-brand-title">LuxuryStay</span>
              <span className="guest-brand-sub">Guest Portal</span>
            </div>
          </Link>

          <nav className="guest-nav-desktop">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `guest-nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="guest-nav-icon">{item.icon}</span>
                <span className="guest-nav-label">{item.label}</span>
              </NavLink>
            ))}
            <Link to="/rooms" className="guest-nav-link browse-link">
              <FaBed /> <span>Browse Rooms</span>
            </Link>
          </nav>

          <div className="guest-user-area">
            <div className="guest-user-display">
              <span className="guest-user-avatar-sm">
                {user?.name?.charAt(0) || 'G'}
              </span>
              <div className="guest-user-meta">
                <span className="guest-user-name-sm">{user?.name}</span>
                <span className="guest-user-role-badge">Guest</span>
              </div>
            </div>
            <button className="guest-logout-btn" onClick={handleLogout} title="Logout">
              <FaSignOutAlt />
            </button>
            <button
              className="guest-mobile-menu-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="guest-mobile-nav" onClick={() => setMobileOpen(false)}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `guest-mobile-link ${isActive ? 'active' : ''}`}
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
          <Link to="/rooms" className="guest-mobile-link">
            <FaBed /> Browse Rooms
          </Link>
        </div>
      )}

      <div className="guest-main-wrapper">
        <main className="guest-main-content">
          {(pageInfo.title || pageInfo.subtitle) && (
            <div className="guest-page-header">
              <div>
                <h1 className="guest-page-title">{pageInfo.title}</h1>
                <p className="guest-page-subtitle">{pageInfo.subtitle}</p>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>
      <AlertContainer />
    </div>
  );
};

export default GuestLayout;
