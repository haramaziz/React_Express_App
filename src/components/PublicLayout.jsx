import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  FaHotel,
  FaBed,
  FaCalendarAlt,
  FaUser,
  FaSignInAlt,
  FaUserPlus,
  FaSignOutAlt,
  FaChevronDown,
  FaBars,
  FaTimes,
  FaInfoCircle,
  FaStar,
  FaCreditCard,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaFacebookF,
  FaInstagram,
  FaTwitter
} from 'react-icons/fa';
import AlertContainer from './AlertContainer';
import { useAuth } from '../contexts/AuthContext';
import { resolveMediaUrl } from '../utils/media';
import * as apiService from '../services/api';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About', icon: <FaInfoCircle /> },
  { to: '/rooms', label: 'Rooms', icon: <FaBed /> },
  { to: '/booking', label: 'Booking', icon: <FaCalendarAlt /> },
  { to: '/feedback', label: 'Feedback', icon: <FaStar /> },
  { to: '/payment', label: 'Payment', icon: <FaCreditCard /> },
  { to: '/contact', label: 'Contact', icon: <FaEnvelope /> }
];

const PublicLayout = () => {
  const { isAuthenticated, user, logout, isGuest, isStaff } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hotelInfo, setHotelInfo] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    apiService.settings
      .getPublic()
      .then((res) => setHotelInfo(res.data?.data?.general || null))
      .catch(() => setHotelInfo(null));
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/');
  };

  const showGuestMenu = isAuthenticated && isGuest();
  const showStaffLink = isAuthenticated && isStaff();
  const avatarSrc = resolveMediaUrl(user?.avatar);
  const hotelName = hotelInfo?.hotelName || 'LuxuryStay Hospitality';
  const address = hotelInfo?.hotelAddress || '123 Luxury Avenue, Downtown';
  const phone = hotelInfo?.hotelPhone || '+1 (555) 010-2000';
  const email = hotelInfo?.hotelEmail || 'concierge@luxurystay.com';

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header-inner">
          <Link to="/" className="public-brand" onClick={() => setMenuOpen(false)}>
            <span className="public-brand-mark">
              <FaHotel />
            </span>
            <span className="public-brand-text">
              <span className="public-brand-name">LuxuryStay</span>
              <span className="public-brand-tag">Hospitality</span>
            </span>
          </Link>

          <nav className={`public-nav ${menuOpen ? 'open' : ''}`}>
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `public-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.icon} {link.label}
              </NavLink>
            ))}
            {showGuestMenu && (
              <NavLink
                to="/my-bookings"
                className={({ isActive }) => `public-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <FaCalendarAlt /> My Bookings
              </NavLink>
            )}
            {showStaffLink && (
              <Link to="/dashboard" className="public-nav-link" onClick={() => setMenuOpen(false)}>
                Staff Portal
              </Link>
            )}
          </nav>

          <div className="public-header-actions">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(false)}>
                  <FaSignInAlt /> Sign In
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setMenuOpen(false)}>
                  <FaUserPlus /> Register
                </Link>
              </>
            ) : showGuestMenu ? (
              <div className="public-user-menu" ref={dropdownRef}>
                <button
                  type="button"
                  className="public-avatar-btn"
                  onClick={() => setDropdownOpen((v) => !v)}
                  aria-expanded={dropdownOpen}
                >
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="" className="public-avatar public-avatar-img" />
                  ) : (
                    <span className="public-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'G'}</span>
                  )}
                  <span className="public-avatar-name">{user?.name?.split(' ')[0]}</span>
                  <FaChevronDown className={`chevron ${dropdownOpen ? 'up' : ''}`} />
                </button>
                {dropdownOpen && (
                  <div className="public-dropdown">
                    <Link to="/my-bookings" onClick={() => setDropdownOpen(false)}>
                      <FaCalendarAlt /> My Bookings
                    </Link>
                    <Link to="/payment" onClick={() => setDropdownOpen(false)}>
                      <FaCreditCard /> Payments
                    </Link>
                    <Link to="/profile" onClick={() => setDropdownOpen(false)}>
                      <FaUser /> Profile Settings
                    </Link>
                    <button type="button" onClick={handleLogout}>
                      <FaSignOutAlt /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                Go to Dashboard
              </Link>
            )}

            <button
              type="button"
              className="public-menu-toggle"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="public-footer-inner public-footer-grid">
          <div className="public-footer-brand-block">
            <div className="public-footer-brand">
              <FaHotel /> {hotelName}
            </div>
            <p>Exceptional stays, effortless booking, and attentive service.</p>
            <div className="public-footer-social">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><FaFacebookF /></a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><FaInstagram /></a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter"><FaTwitter /></a>
            </div>
          </div>

          <div>
            <h4>Explore</h4>
            <ul className="public-footer-links">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Contact</h4>
            <ul className="public-footer-contact">
              <li><FaMapMarkerAlt /> {address}</li>
              <li><FaPhone /> <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a></li>
              <li><FaEnvelope /> <a href={`mailto:${email}`}>{email}</a></li>
            </ul>
          </div>
        </div>
        <p className="public-footer-copy">© {new Date().getFullYear()} LuxuryStay. All rights reserved.</p>
      </footer>

      <AlertContainer />
    </div>
  );
};

export default PublicLayout;
