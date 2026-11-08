import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AlertContainer from './AlertContainer';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { hasRole } = useAuth();
  const isHousekeepingOnly = hasRole('housekeeping');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pageTitles = {
    '/dashboard': { title: 'Dashboard', subtitle: 'Welcome back! Here\'s what\'s happening today.' },
    '/rooms': { title: 'Room Management', subtitle: 'Manage room inventory, status, and pricing.' },
    '/room-management': isHousekeepingOnly
      ? { title: 'Room Cleaning', subtitle: 'Update cleaning progress: Pending, In Progress, or Cleaned.' }
      : { title: 'Room Management', subtitle: 'Manage room inventory, status, and pricing.' },
    '/bookings': { title: 'Booking Management', subtitle: 'View and manage all reservations, check-ins and check-outs.' },
    '/guests': { title: 'Guest Management', subtitle: 'Guest profiles, preferences, and loyalty program.' },
    '/billing': { title: 'Billing & Invoicing', subtitle: 'Manage invoices, payments, and financial transactions.' },
    '/maintenance': isHousekeepingOnly
      ? { title: 'Maintenance & Cleaning Tasks', subtitle: 'View, start, and complete work orders assigned to you or your department.' }
      : { title: 'Maintenance & Housekeeping', subtitle: 'Assign work orders to housekeeping and track resolution.' },
    '/reviews': { title: 'Guest Reviews', subtitle: 'Review and respond to guest ratings and comments.' },
    '/reports': { title: 'Reports & Analytics', subtitle: 'Comprehensive insights into hotel operations.' },
    '/users': { title: 'Staff Management', subtitle: 'Manage staff accounts, roles, and permissions.' },
    '/settings': { title: 'System Settings', subtitle: 'Configure hotel policies, rates, and system options.' },
    '/account': { title: 'My Profile', subtitle: 'View and update your account information.' }
  };

  const pageInfo = pageTitles[location.pathname] || { title: '', subtitle: '' };

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <Sidebar />
      <div className="main-wrapper">
        <Navbar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="main-content">
          {(pageInfo.title || pageInfo.subtitle) && (
            <div className="page-header">
              <div>
                <h1 className="page-title">{pageInfo.title}</h1>
                <p className="page-subtitle">{pageInfo.subtitle}</p>
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

export default Layout;
