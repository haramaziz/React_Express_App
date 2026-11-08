import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBell, FaSignOutAlt, FaSearch, FaBars } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import * as apiService from '../services/api';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const alert = useAlert();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 4000);
    const handleRefresh = () => loadNotifications();
    window.addEventListener('refresh-notifications', handleRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-notifications', handleRefresh);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await apiService.notifications.getAll({ limit: 10 });
      setNotifications(res.data.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (e) {
      // silent
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const markAllRead = async () => {
    try {
      await apiService.notifications.markAllRead();
      setUnreadCount(0);
      setNotifications(n => n.map(x => ({ ...x, read: true })));
    } catch (e) {
      alert.handleApiError(e);
    }
  };

  const openNotification = async (n) => {
    try {
      if (!n.read) {
        await apiService.notifications.markRead(n._id);
        setUnreadCount(c => Math.max(0, c - 1));
        setNotifications(list => list.map(x => x._id === n._id ? { ...x, read: true } : x));
      }
    } catch {
      // still navigate
    }
    setNotifOpen(false);
    if (n.actionUrl) {
      navigate(n.actionUrl);
    }
  };

  const roleColors = {
    admin: 'role-badge role-admin',
    manager: 'role-badge role-manager',
    receptionist: 'role-badge role-reception',
    housekeeping: 'role-badge role-housekeeping',
    guest: 'role-badge role-guest'
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="menu-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <FaBars />
        </button>
        <div className="navbar-search">
          <FaSearch className="search-icon" />
          <input type="text" placeholder="Search anything..." className="search-input" />
        </div>
      </div>

      <div className="navbar-right">
        <div className={`notif-wrapper ${notifOpen ? 'open' : ''}`}>
          <button
            className="notif-btn"
            onClick={() => {
              setNotifOpen(!notifOpen);
              if (!notifOpen) loadNotifications();
            }}
            aria-label="Notifications"
          >
            <FaBell />
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="notif-dropdown" onClick={e => e.stopPropagation()}>
              <div className="notif-header">
                <span className="notif-title">Notifications ({unreadCount} unread)</span>
                {unreadCount > 0 && (
                  <button className="btn-link" onClick={markAllRead}>Mark all read</button>
                )}
              </div>
              <div className="notif-list">
                {notifications.length === 0 && (
                  <div className="notif-empty">No notifications</div>
                )}
                {notifications.map(n => (
                  <div
                    key={n._id}
                    className={`notif-item ${n.read ? 'read' : ''} priority-${n.priority}`}
                    onClick={() => openNotification(n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') openNotification(n); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="notif-body">
                      <strong>{n.title}</strong>
                      <p>{n.message}</p>
                      <span className="notif-time">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="user-menu">
          <div className="user-display">
            <span className="user-avatar-sm">
              {user?.name?.charAt(0) || 'U'}
            </span>
            <div className="user-meta">
              <span className="user-name-sm">{user?.name}</span>
              <span className={roleColors[user?.role] || 'role-badge'}>
                {user?.role}
              </span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <FaSignOutAlt />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
