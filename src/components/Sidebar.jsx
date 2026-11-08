import { NavLink, useNavigate } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaBed,
  FaCalendarCheck,
  FaUsers,
  FaFileInvoiceDollar,
  FaTools,
  FaStar,
  FaChartBar,
  FaUserShield,
  FaCog,
  FaUserCircle,
  FaHotel
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const { user, hasRole } = useAuth();

  const isAdmin = hasRole('admin');
  const isManager = hasRole('admin', 'manager');
  const isReception = hasRole('admin', 'manager', 'receptionist');
  const isHousekeeping = hasRole('admin', 'manager', 'housekeeping');
  const isHousekeepingOnly = hasRole('housekeeping');

  const navItems = [
    { to: '/dashboard', icon: <FaTachometerAlt />, label: 'Dashboard', show: true },
    { to: '/room-management', icon: <FaBed />, label: isHousekeepingOnly ? 'Room Cleaning' : 'Rooms', show: true },
    { to: '/bookings', icon: <FaCalendarCheck />, label: 'Bookings', show: isReception },
    { to: '/guests', icon: <FaUsers />, label: 'Guests', show: isReception },
    { to: '/billing', icon: <FaFileInvoiceDollar />, label: 'Billing', show: isReception },
    { to: '/maintenance', icon: <FaTools />, label: isHousekeepingOnly ? 'Work Orders' : 'Maintenance', show: isHousekeeping },
    { to: '/reviews', icon: <FaStar />, label: 'Reviews', show: isManager },
    { to: '/reports', icon: <FaChartBar />, label: 'Reports', show: isManager },
    { to: '/users', icon: <FaUserShield />, label: 'Staff', show: isManager },
    { to: '/settings', icon: <FaCog />, label: 'Settings', show: isAdmin },
    { to: '/account', icon: <FaUserCircle />, label: 'My Profile', show: true }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <FaHotel className="brand-icon" />
        <div className="brand-text">
          <span className="brand-title">LuxuryStay</span>
          <span className="brand-sub">HMS Dashboard</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.filter(item => item.show).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'User'}</span>
            <span className="user-role">{user?.role || 'guest'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
