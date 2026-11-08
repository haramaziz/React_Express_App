import { useState, useEffect } from 'react';
import {
  FaBed,
  FaCalendarCheck,
  FaUsers,
  FaDollarSign,
  FaWrench,
  FaStar,
  FaChartLine,
  FaArrowUp,
  FaUserCheck,
  FaUserPlus,
  FaClipboardList,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaTools,
  FaBroom
} from 'react-icons/fa';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { StatCard, Card, Badge, BookingStatusBadge, RoomStatusBadge, CleaningProgressBadge, formatCurrency, formatDate, Spinner, DataTable, Button, Modal, FormInput, FormTextarea } from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const alert = useAlert();
  const { hasRole, isGuest, user } = useAuth();

  const isAdmin = hasRole('admin');
  const isManager = hasRole('admin', 'manager');
  const isReceptionist = hasRole('receptionist');
  const isHousekeeping = hasRole('housekeeping');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => loadDashboardData(true), 8000);
    const handleRefresh = () => loadDashboardData(true);
    window.addEventListener('refresh-dashboard', handleRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-dashboard', handleRefresh);
    };
  }, [isManager, isReceptionist, isHousekeeping]);

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const result = {};

      if (isManager) {
        const [ov, tdy, rev, resolved] = await Promise.all([
          apiService.reports.overview().catch(() => ({ data: { data: { dashboard: null } } })),
          apiService.bookings.getToday().catch(() => ({ data: { data: { arrivals: [], departures: [], inHouse: [] } } })),
          apiService.billing.getSummary().catch(() => ({ data: { data: null } })),
          apiService.maintenance.getAll({ status: 'completed' }).catch(() => ({ data: { data: { requests: [] } } }))
        ]);
        result.overview = ov?.data?.data?.dashboard || null;
        result.today = tdy?.data?.data || { arrivals: { items: [] }, departures: { items: [] }, inHouse: { items: [] } };
        result.revenue = rev?.data?.data || null;
        result.resolvedMaintenance = resolved?.data?.data?.requests || [];
      }

      if (isReceptionist && !isManager) {
        const [tdy, rooms, billSum] = await Promise.all([
          apiService.bookings.getToday(),
          apiService.rooms.getStats(),
          apiService.billing.getSummary().catch(() => null)
        ]);
        result.today = tdy?.data?.data || { arrivals: { items: [] }, departures: { items: [] }, inHouse: { items: [] } };
        result.roomsStats = rooms?.data?.data?.stats || null;
        result.roomsByType = rooms?.data?.data?.byType || [];
        result.revenue = billSum?.data?.data || null;
      }

      if (isHousekeeping) {
        const [rooms, maint, cleaning] = await Promise.all([
          apiService.rooms.getStats(),
          apiService.maintenance.getAll({}).catch(() => ({ data: { data: { requests: [] }, stats: {} } })),
          apiService.rooms.getCleaning().catch(() => ({ data: { data: { pending: [], inProgress: [], rooms: [], stats: {} } } }))
        ]);
        result.roomsStats = rooms?.data?.data?.stats || null;
        result.roomsByType = rooms?.data?.data?.byType || [];
        result.maintenance = maint?.data?.data?.requests || maint?.data?.requests || [];
        result.maintenanceStats = maint?.data?.stats || null;
        result.pendingCleaning = cleaning?.data?.data?.pending || [];
        result.inProgressCleaning = cleaning?.data?.data?.inProgress || [];
        result.cleaningStats = cleaning?.data?.data?.stats || {};
        result.allRooms = cleaning?.data?.data?.rooms || [];
        result.cleaningRooms = result.pendingCleaning;
      }

      setData(result);
    } catch (err) {
      alert.handleApiError(err, 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isManager) {
    return renderManagerDashboard(data);
  }

  if (isReceptionist) {
    return renderReceptionistDashboard(data);
  }

  if (isHousekeeping) {
    return <HousekeepingDashboard data={data} onRefresh={() => loadDashboardData(true)} user={user} />;
  }

  return renderFallbackDashboard();
};

const renderManagerDashboard = (data) => {
  const { overview, today, revenue, resolvedMaintenance } = data || {};
  const recentlyResolved = (resolvedMaintenance || []).slice(0, 6);

  const occupancyData = {
    labels: overview?.occupancyLast30?.slice(-14).map(d => d._id) || [],
    datasets: [{
      label: 'Bookings',
      data: overview?.occupancyLast30?.slice(-14).map(d => d.count) || [],
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };
  const occupancyChartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
  };

  const roomsByStatusData = {
    labels: ['Available', 'Occupied', 'Cleaning', 'Maintenance'],
    datasets: [{
      data: [
        overview?.rooms?.available || 0,
        overview?.rooms?.occupied || 0,
        Math.max(0, (overview?.rooms?.total || 0) - (overview?.rooms?.available || 0) - (overview?.rooms?.occupied || 0)),
        0
      ],
      backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#6b7280'],
      borderWidth: 0
    }]
  };
  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } } },
    cutout: '65%'
  };

  const revenueChartData = {
    labels: revenue?.dailyRevenue?.map(d => d._id) || [],
    datasets: [{
      label: 'Revenue ($)',
      data: revenue?.dailyRevenue?.map(d => d.revenue) || [],
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderRadius: 6
    }]
  };
  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
  };

  const quickColumns = [
    { key: 'bookingReference', label: 'Ref #', render: v => <strong>{v}</strong> },
    { key: 'guest', label: 'Guest', render: (_, r) => `${r.guest?.firstName || ''} ${r.guest?.lastName || ''}` },
    { key: 'room', label: 'Room', render: v => v?.roomNumber || '-' },
    { key: 'checkIn', label: 'Check-in', render: v => formatDate(v, 'short') },
    { key: 'checkOut', label: 'Check-out', render: v => formatDate(v, 'short') },
    { key: 'status', label: 'Status', render: v => <BookingStatusBadge status={v} /> },
    { key: 'totalAmount', label: 'Total', render: v => formatCurrency(v) }
  ];

  return (
    <div className="dashboard-page">
      <div className="stats-grid">
        <StatCard title="Occupancy Rate" value={`${overview?.rooms?.occupancyRate || 0}%`} subtitle={`${overview?.rooms?.occupied || 0} of ${overview?.rooms?.total || 0} rooms`} icon={<FaBed />} color="primary" trend={12} />
        <StatCard title="In-House Guests" value={overview?.guests?.inHouse || 0} subtitle={`Arrivals: ${today?.arrivals?.count || 0} • Departures: ${today?.departures?.count || 0}`} icon={<FaUserCheck />} color="success" />
        <StatCard title="Total Revenue (MTD)" value={formatCurrency(overview?.revenue?.thisMonth || 0)} subtitle={`Lifetime: ${formatCurrency(overview?.revenue?.total || 0)}`} icon={<FaDollarSign />} color="warning" trend={8.4} />
        <StatCard title="New Guests (MTD)" value={overview?.guests?.newThisMonth || 0} subtitle={`Total: ${overview?.guests?.total || 0} guests`} icon={<FaUserPlus />} color="info" />
        <StatCard title="Bookings (MTD)" value={overview?.bookings?.thisMonth || 0} subtitle={`Lifetime: ${overview?.bookings?.total || 0} bookings`} icon={<FaCalendarCheck />} color="primary" />
        <StatCard title="Open Maintenance" value={overview?.maintenance?.openTickets || 0} subtitle="Pending and in-progress" icon={<FaWrench />} color="danger" />
        <StatCard title="Avg. Guest Rating" value={overview?.feedback?.averageRating || 'N/A'} subtitle="Based on all guest reviews" icon={<FaStar />} color="warning" />
        <StatCard title="Total Guests" value={overview?.guests?.total || 0} subtitle={`New this month: ${overview?.guests?.newThisMonth || 0}`} icon={<FaUsers />} color="info" />
      </div>

      <div className="dashboard-grid">
        <Card title="Occupancy Trend (Last 14 Days)" icon={<FaChartLine />}>
          <div className="chart-container" style={{ height: '280px' }}>
            <Line data={occupancyData} options={occupancyChartOpts} />
          </div>
        </Card>
        <Card title="Room Status Distribution">
          <div className="chart-container" style={{ height: '280px' }}>
            <Doughnut data={roomsByStatusData} options={doughnutOpts} />
          </div>
        </Card>
        <Card title="Daily Revenue (Last Week)" icon={<FaArrowUp />}>
          <div className="chart-container" style={{ height: '280px' }}>
            <Bar data={revenueChartData} options={barOpts} />
          </div>
        </Card>
        <Card
          title="Today's Activity"
          subtitle={`${today?.arrivals?.count || 0} arrivals • ${today?.departures?.count || 0} departures • ${today?.inHouse?.count || 0} in-house`}
        >
          <div className="today-activity">
            <div className="activity-section">
              <div className="activity-header">
                <h4><FaClipboardList style={{ color: '#10b981' }} /> Arrivals</h4>
                <Badge variant="success">{today?.arrivals?.count || 0}</Badge>
              </div>
              {today?.arrivals?.items?.length === 0 && <p className="no-activity">No arrivals today</p>}
              {today?.arrivals?.items?.slice(0, 3).map(b => (
                <div key={b._id} className="activity-item">
                  <div className="activity-info">
                    <strong>{b.guest?.firstName} {b.guest?.lastName}</strong>
                    <span>Room {b.room?.roomNumber} • {b.room?.roomType}</span>
                  </div>
                  <BookingStatusBadge status={b.status} />
                </div>
              ))}
            </div>
            <div className="activity-section">
              <div className="activity-header">
                <h4><FaClipboardList style={{ color: '#ef4444' }} /> Departures</h4>
                <Badge variant="danger">{today?.departures?.count || 0}</Badge>
              </div>
              {today?.departures?.items?.length === 0 && <p className="no-activity">No departures today</p>}
              {today?.departures?.items?.slice(0, 3).map(b => (
                <div key={b._id} className="activity-item">
                  <div className="activity-info">
                    <strong>{b.guest?.firstName} {b.guest?.lastName}</strong>
                    <span>Room {b.room?.roomNumber} • {formatCurrency(b.totalAmount)}</span>
                  </div>
                  <BookingStatusBadge status={b.status} />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card title="Recently Resolved Maintenance" className="mt-4" subtitle="Housekeeping completions — you are notified as soon as a work order is marked complete">
        <DataTable
          columns={[
            { key: 'requestNumber', label: 'Ref #', render: v => <strong>{v}</strong> },
            { key: 'title', label: 'Task' },
            { key: 'category', label: 'Category', render: v => <Badge variant="info">{v}</Badge> },
            { key: 'assignedTo', label: 'Completed By', render: v => v?.name || 'Staff' },
            { key: 'completedAt', label: 'Resolved', render: v => v ? formatDate(v, 'full') : '—' },
            { key: 'status', label: 'Status', render: v => <Badge variant="success">{String(v || '').replace('_', ' ')}</Badge> }
          ]}
          data={recentlyResolved}
          emptyMessage="No completed maintenance tasks yet"
        />
      </Card>

      <Card title="Recent & Upcoming Bookings" className="mt-4">
        <DataTable
          columns={quickColumns}
          data={[
            ...(today?.inHouse?.items || []),
            ...(today?.arrivals?.items || []),
            ...(today?.departures?.items || [])
          ].slice(0, 8)}
          emptyMessage="No bookings to display"
        />
      </Card>
    </div>
  );
};

const renderReceptionistDashboard = (data) => {
  const { today, roomsStats, roomsByType, revenue } = data || {};
  const t = today || { arrivals: { items: [], count: 0 }, departures: { items: [], count: 0 }, inHouse: { items: [], count: 0 } };
  const rs = roomsStats || { total: 0, available: 0, occupied: 0, cleaning: 0, maintenance: 0, reserved: 0 };

  const roomsByStatusData = {
    labels: ['Available', 'Occupied', 'Cleaning', 'Maintenance', 'Reserved'],
    datasets: [{
      data: [rs.available || 0, rs.occupied || 0, rs.cleaning || 0, rs.maintenance || 0, rs.reserved || 0],
      backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#6b7280', '#3b82f6'],
      borderWidth: 0
    }]
  };
  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } } },
    cutout: '65%'
  };

  const revenueChartData = {
    labels: revenue?.dailyRevenue?.map(d => d._id) || [],
    datasets: [{
      label: 'Revenue ($)',
      data: revenue?.dailyRevenue?.map(d => d.revenue) || [],
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderRadius: 6
    }]
  };
  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
  };

  const quickColumns = [
    { key: 'bookingReference', label: 'Ref #', render: v => <strong>{v}</strong> },
    { key: 'guest', label: 'Guest', render: (_, r) => `${r.guest?.firstName || ''} ${r.guest?.lastName || ''}` },
    { key: 'room', label: 'Room', render: v => v?.roomNumber || '-' },
    { key: 'checkIn', label: 'Check-in', render: v => formatDate(v, 'short') },
    { key: 'checkOut', label: 'Check-out', render: v => formatDate(v, 'short') },
    { key: 'status', label: 'Status', render: v => <BookingStatusBadge status={v} /> },
    { key: 'totalAmount', label: 'Total', render: v => formatCurrency(v) }
  ];

  return (
    <div className="dashboard-page">
      <div className="stats-grid">
        <StatCard title="Available Rooms" value={rs.available || 0} subtitle={`Total: ${rs.total || 0}`} icon={<FaBed />} color="success" />
        <StatCard title="Occupied" value={rs.occupied || 0} subtitle={`In-house: ${t.inHouse?.count || 0}`} icon={<FaUserCheck />} color="danger" />
        <StatCard title="In Cleaning" value={rs.cleaning || 0} subtitle="Pending cleaning" icon={<FaBroom />} color="warning" />
        <StatCard title="In Maintenance" value={rs.maintenance || 0} subtitle="Out of service" icon={<FaWrench />} color="primary" />
        <StatCard title="Arrivals Today" value={t.arrivals?.count || 0} subtitle="Expected check-ins" icon={<FaCalendarCheck />} color="info" />
        <StatCard title="Departures Today" value={t.departures?.count || 0} subtitle="Expected check-outs" icon={<FaCheckCircle />} color="success" />
      </div>

      <div className="dashboard-grid">
        <Card title="Room Status Overview">
          <div className="chart-container" style={{ height: '280px' }}>
            <Doughnut data={roomsByStatusData} options={doughnutOpts} />
          </div>
        </Card>
        <Card
          title="Today's Activity"
          subtitle={`${t.arrivals?.count || 0} arrivals • ${t.departures?.count || 0} departures • ${t.inHouse?.count || 0} in-house`}
        >
          <div className="today-activity">
            <div className="activity-section">
              <div className="activity-header">
                <h4><FaClipboardList style={{ color: '#10b981' }} /> Arrivals</h4>
                <Badge variant="success">{t.arrivals?.count || 0}</Badge>
              </div>
              {t.arrivals?.items?.length === 0 && <p className="no-activity">No arrivals today</p>}
              {t.arrivals?.items?.slice(0, 3).map(b => (
                <div key={b._id} className="activity-item">
                  <div className="activity-info">
                    <strong>{b.guest?.firstName} {b.guest?.lastName}</strong>
                    <span>Room {b.room?.roomNumber || '—'} • {b.room?.roomType || ''}</span>
                  </div>
                  <BookingStatusBadge status={b.status} />
                </div>
              ))}
            </div>
            <div className="activity-section">
              <div className="activity-header">
                <h4><FaClipboardList style={{ color: '#ef4444' }} /> Departures</h4>
                <Badge variant="danger">{t.departures?.count || 0}</Badge>
              </div>
              {t.departures?.items?.length === 0 && <p className="no-activity">No departures today</p>}
              {t.departures?.items?.slice(0, 3).map(b => (
                <div key={b._id} className="activity-item">
                  <div className="activity-info">
                    <strong>{b.guest?.firstName} {b.guest?.lastName}</strong>
                    <span>Room {b.room?.roomNumber || '—'} • {formatCurrency(b.totalAmount)}</span>
                  </div>
                  <BookingStatusBadge status={b.status} />
                </div>
              ))}
            </div>
          </div>
        </Card>
        {revenue?.dailyRevenue && (
          <Card title="Daily Revenue (Last Week)" icon={<FaArrowUp />}>
            <div className="chart-container" style={{ height: '280px' }}>
              <Bar data={revenueChartData} options={barOpts} />
            </div>
          </Card>
        )}
        <Card title="Room Types Snapshot">
          <div style={{ padding: '0.5rem 0' }}>
            {roomsByType && roomsByType.length > 0 ? (
              roomsByType.map((rt, i) => (
                <div key={rt._id || i} className="room-type-row">
                  <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{rt._id || 'Other'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Avg {formatCurrency(rt.avgPrice || 0)}/night
                    </span>
                    <Badge variant="primary">{rt.count || 0} room{rt.count !== 1 ? 's' : ''}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                No room types yet. Add rooms in the Rooms section.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card title="Today &amp; In-House Bookings" className="mt-4">
        <DataTable
          columns={quickColumns}
          data={[
            ...(t.inHouse?.items || []),
            ...(t.arrivals?.items || []),
            ...(t.departures?.items || [])
          ].slice(0, 10)}
          emptyMessage="No bookings to display"
        />
      </Card>
    </div>
  );
};

const HousekeepingDashboard = ({ data, onRefresh, user }) => {
  const alert = useAlert();
  const [busyId, setBusyId] = useState(null);
  const [completeTask, setCompleteTask] = useState(null);
  const [completeForm, setCompleteForm] = useState({ resolutionNotes: '', actualCost: '' });
  const [submitting, setSubmitting] = useState(false);
  const { roomsStats, maintenance, maintenanceStats, pendingCleaning, inProgressCleaning, cleaningStats } = data || {};
  const rs = roomsStats || { total: 0, available: 0, occupied: 0, cleaning: 0, maintenance: 0, reserved: 0 };
  const ms = maintenanceStats || { total: 0, pending: 0, inProgress: 0, completed: 0, urgent: 0 };
  const requests = maintenance || [];
  const openRequests = requests.filter(r => ['pending', 'assigned', 'in_progress'].includes(r.status));
  const pendingRooms = pendingCleaning || [];
  const inProgressRooms = inProgressCleaning || [];

  useEffect(() => {
    const timer = setInterval(() => onRefresh?.(), 30000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  const handleRoomProgress = async (room, progress) => {
    try {
      setBusyId(room._id);
      await apiService.rooms.updateCleaningProgress(room._id, progress);
      alert.success(
        progress === 'cleaned'
          ? `Room ${room.roomNumber} marked cleaned — managers notified`
          : `Room ${room.roomNumber} set to ${progress === 'in_progress' ? 'In Progress' : 'Pending'}`
      );
      onRefresh?.();
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setBusyId(null);
    }
  };

  const handleStartTask = async (task) => {
    try {
      setBusyId(task._id);
      await apiService.maintenance.start(task._id);
      alert.success('Task started (marked In Progress)');
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      onRefresh?.();
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setBusyId(null);
    }
  };

  const handlePendingTask = async (task) => {
    try {
      setBusyId(task._id);
      await apiService.maintenance.updateStatus(task._id, { status: 'pending' });
      alert.info(`Task #${task.requestNumber} moved back to Pending`);
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      onRefresh?.();
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setBusyId(null);
    }
  };

  const handleCompleteTask = (task) => {
    setCompleteTask(task);
    setCompleteForm({ resolutionNotes: '', actualCost: task.estimatedCost || '' });
  };

  const submitCompleteTask = async () => {
    if (!completeTask) return;
    if (!completeForm.resolutionNotes?.trim()) {
      alert.error('Please enter resolution notes so managers can see what was done');
      return;
    }
    try {
      setSubmitting(true);
      setBusyId(completeTask._id);
      await apiService.maintenance.complete(completeTask._id, completeForm);
      alert.success('Task completed — managers have been notified');
      setCompleteTask(null);
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      onRefresh?.();
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setSubmitting(false);
      setBusyId(null);
    }
  };

  const reqColumns = [
    { key: 'requestNumber', label: 'Ticket #', render: v => <strong>{v}</strong> },
    { key: 'room', label: 'Room', render: v => v?.roomNumber ? `Room ${v.roomNumber}` : '—' },
    { key: 'title', label: 'Task' },
    { key: 'category', label: 'Category', render: v => <Badge variant="info">{v}</Badge> },
    { key: 'priority', label: 'Priority', render: v => {
        const p = { low: 'info', medium: 'warning', high: 'danger', urgent: 'danger' };
        return <Badge variant={p[v] || 'default'} style={{ textTransform: 'capitalize' }}>{v || '-'}</Badge>;
      } },
    { key: 'status', label: 'Status', render: v => {
        const s = { pending: 'warning', assigned: 'info', in_progress: 'primary', completed: 'success', cancelled: 'secondary' };
        return <Badge variant={s[v] || 'default'} style={{ textTransform: 'capitalize' }}>{v?.replace('_', ' ') || '-'}</Badge>;
      } },
    {
      key: '_actions',
      label: 'Actions',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {['pending', 'assigned'].includes(r.status) && (
            <Button size="sm" variant="info" disabled={busyId === r._id} onClick={() => handleStartTask(r)}>Start</Button>
          )}
          {r.status === 'in_progress' && (
            <Button size="sm" variant="success" disabled={busyId === r._id} onClick={() => handleCompleteTask(r)}>Done</Button>
          )}
        </div>
      )
    }
  ];

  const roomColumns = [
    { key: 'roomNumber', label: 'Room #', render: v => <strong>{v}</strong> },
    { key: 'roomType', label: 'Type', render: v => v ? (v.charAt(0).toUpperCase() + v.slice(1)) : '-' },
    { key: 'floor', label: 'Floor' },
    {
      key: 'cleaningProgress',
      label: 'Progress',
      render: (v) => <CleaningProgressBadge progress={v || 'pending'} />
    },
    { key: 'lastCleaned', label: 'Last Cleaned', render: v => v ? formatDate(v) : <span style={{ color: 'var(--text-secondary)' }}>Never</span> },
    {
      key: '_actions',
      label: 'Update',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {(r.cleaningProgress || 'pending') !== 'in_progress' && (
            <Button size="sm" variant="info" disabled={busyId === r._id} onClick={() => handleRoomProgress(r, 'in_progress')}>Start</Button>
          )}
          <Button size="sm" variant="success" disabled={busyId === r._id} onClick={() => handleRoomProgress(r, 'cleaned')}>Cleaned</Button>
        </div>
      )
    }
  ];

  return (
    <div className="dashboard-page">
      <div className="stats-grid">
        <StatCard title="Pending Cleaning Rooms" value={cleaningStats?.pending ?? pendingRooms.length} subtitle="Needs immediate attention" icon={<FaBroom />} color="warning" />
        <StatCard title="My Open Tasks" value={openRequests.length} subtitle={`${ms.pending || 0} pending • ${ms.inProgress || 0} in-progress`} icon={<FaTools />} color="danger" />
        <StatCard title="In Progress Rooms" value={cleaningStats?.inProgress ?? inProgressRooms.length} subtitle="Currently being cleaned" icon={<FaClock />} color="primary" />
        <StatCard title="Rooms Available" value={rs.available || 0} subtitle={`Total rooms: ${rs.total || 0}`} icon={<FaCheckCircle />} color="success" />
      </div>

      <div className="dashboard-grid">
        <Card
          title="Pending Cleaning Rooms"
          subtitle={`${pendingRooms.length} room${pendingRooms.length !== 1 ? 's' : ''} awaiting cleaning`}
        >
          {pendingRooms.length === 0 ? (
            <div className="empty-state small">
              <FaCheckCircle className="empty-icon-sm" style={{ color: 'var(--success)' }} />
              <p style={{ margin: 0 }}>No pending cleaning rooms.</p>
            </div>
          ) : (
            <div className="room-clean-list">
              {pendingRooms.slice(0, 8).map(r => (
                <div key={r._id} className="room-clean-item status-cleaning">
                  <div className="room-clean-header">
                    <strong>Room {r.roomNumber}</strong>
                    <CleaningProgressBadge progress="pending" />
                  </div>
                  <div className="room-clean-meta">
                    <span>{r.roomType ? (r.roomType.charAt(0).toUpperCase() + r.roomType.slice(1)) : ''}</span>
                    <span>Floor {r.floor || '-'}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Last cleaned: {r.lastCleaned ? formatDate(r.lastCleaned) : 'Never'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                    <Button size="sm" variant="info" disabled={busyId === r._id} onClick={() => handleRoomProgress(r, 'in_progress')}>Start Cleaning</Button>
                    <Button size="sm" variant="success" disabled={busyId === r._id} onClick={() => handleRoomProgress(r, 'cleaned')}>Mark Cleaned</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="My Assigned Work Orders"
          subtitle={`${openRequests.length} active maintenance/cleaning task${openRequests.length !== 1 ? 's' : ''} for ${user?.name || 'you'}`}
        >
          {openRequests.length === 0 ? (
            <div className="empty-state small">
              <FaCheckCircle className="empty-icon-sm" style={{ color: 'var(--success)' }} />
              <p style={{ margin: 0 }}>All caught up! No open work orders.</p>
            </div>
          ) : (
            <div className="task-list">
              {openRequests.slice(0, 6).map(r => (
                <div key={r._id} className={`task-item priority-${r.priority}`}>
                  <div className="task-header">
                    <strong>#{r.requestNumber} {r.title}</strong>
                    <Badge variant={
                      r.status === 'in_progress' ? 'primary' : r.priority === 'urgent' ? 'danger' : 'warning'
                    }>
                      {r.status === 'in_progress' ? 'In Progress' : r.status === 'assigned' ? 'Assigned' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="task-meta">
                    {r.room?.roomNumber && <span><FaBed /> Room {r.room.roomNumber}</span>}
                    <span><FaClock /> {formatDate(r.reportedAt, 'short')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {['pending', 'assigned'].includes(r.status) && (
                      <Button size="sm" variant="info" disabled={busyId === r._id} onClick={() => handleStartTask(r)}>Start</Button>
                    )}
                    {r.status === 'in_progress' && (
                      <Button size="sm" variant="success" disabled={busyId === r._id} onClick={() => handleCompleteTask(r)}>Complete</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Open Maintenance & Cleaning Tasks" className="mt-4" subtitle="Assigned or department-pool work orders — start, then complete with notes (managers are notified)">
        <DataTable
          columns={reqColumns}
          data={openRequests}
          emptyMessage="No open work orders. Nice!"
        />
      </Card>

      <Card title="Cleaning Workflow Board" className="mt-4" subtitle="Pending and in-progress rooms — managers are notified when marked Cleaned">
        <DataTable
          columns={roomColumns}
          data={[...pendingRooms, ...inProgressRooms]}
          emptyMessage="No rooms in the cleaning workflow"
        />
      </Card>

      <Modal
        isOpen={Boolean(completeTask)}
        onClose={() => setCompleteTask(null)}
        title={`Complete Task ${completeTask?.requestNumber || ''}`}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setCompleteTask(null)}>Cancel</Button>
            <Button variant="primary" onClick={submitCompleteTask} disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Confirm & Complete'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Marking <strong>{completeTask?.title}</strong> as completed. An automated real-time notification alert will be sent to the Managers and Admins.
          </p>
          <FormInput
            label="Actual Cost ($)"
            type="number"
            value={completeForm.actualCost}
            onChange={e => setCompleteForm({ ...completeForm, actualCost: e.target.value })}
            placeholder="0.00"
          />
          <FormTextarea
            label="Resolution Notes"
            rows={4}
            value={completeForm.resolutionNotes}
            onChange={e => setCompleteForm({ ...completeForm, resolutionNotes: e.target.value })}
            placeholder="Describe how the maintenance or cleaning task was resolved..."
            required
          />
        </div>
      </Modal>
    </div>
  );
};

const renderFallbackDashboard = () => {
  return (
    <div className="dashboard-page">
      <Card title="Dashboard">
        <div className="empty-state">
          <FaChartLine className="empty-icon" />
          <p>Welcome to the LuxuryStay HMS Dashboard.</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            No data is currently available. Please use the sidebar to navigate to the appropriate section, or contact Admin if you believe this is an error.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
