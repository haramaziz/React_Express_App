import { useState, useEffect } from 'react';
import {
  FaChartLine, FaUsers, FaDollarSign, FaTools, FaUserTie,
  FaDownload, FaCalendarAlt
} from 'react-icons/fa';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import { Card, Button, Spinner, Badge, formatCurrency, FormSelect, FormInput } from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const Reports = () => {
  const alert = useAlert();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [guestsRpt, setGuestsRpt] = useState(null);
  const [staffRpt, setStaffRpt] = useState(null);
  const [maintRpt, setMaintRpt] = useState(null);
  const [period, setPeriod] = useState('90');

  useEffect(() => { loadReport(); }, [activeTab, period]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const from = new Date(Date.now() - Number(period) * 86400000).toISOString();
      const to = new Date().toISOString();
      const params = { from, to };

      switch (activeTab) {
        case 'overview':
          const ov = await apiService.reports.overview();
          setOverview(ov.data.data.dashboard);
          break;
        case 'occupancy':
          const oc = await apiService.reports.occupancy(params);
          setOccupancy(oc.data.data);
          break;
        case 'revenue':
          const rv = await apiService.reports.revenue({ ...params, period: 'monthly' });
          setRevenue(rv.data.data);
          break;
        case 'guests':
          const gs = await apiService.reports.guests();
          setGuestsRpt(gs.data.data);
          break;
        case 'staff':
          const st = await apiService.reports.staff();
          setStaffRpt(st.data.data);
          break;
        case 'maintenance':
          const mt = await apiService.reports.maintenance();
          setMaintRpt(mt.data.data);
          break;
      }
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FaChartLine /> },
    { id: 'occupancy', label: 'Occupancy', icon: <FaUsers /> },
    { id: 'revenue', label: 'Revenue', icon: <FaDollarSign /> },
    { id: 'guests', label: 'Guests', icon: <FaUsers /> },
    { id: 'staff', label: 'Staff', icon: <FaUserTie /> },
    { id: 'maintenance', label: 'Maintenance', icon: <FaTools /> }
  ];

  const handleExport = async (type = 'bookings') => {
    try {
      const from = new Date(Date.now() - Number(period) * 86400000).toISOString();
      const to = new Date().toISOString();
      const res = await apiService.reports.export({ type, from, to });
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      if (!rows.length) {
        alert.info('No records found for this export period');
        return;
      }

      const headers = Object.keys(rows[0]).filter(k => !['_id', '__v'].includes(k));
      const csvLines = [
        headers.join(','),
        ...rows.map(row => headers.map(h => {
          let val = row[h];
          if (val && typeof val === 'object') {
            val = val.firstName ? `${val.firstName} ${val.lastName || ''}`.trim()
              : val.roomNumber || val.name || JSON.stringify(val);
          }
          const str = String(val ?? '').replace(/"/g, '""');
          return `"${str}"`;
        }).join(','))
      ];

      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `luxurystay-${type}-${period}d.csv`;
      a.click();
      URL.revokeObjectURL(url);
      alert.success('Report exported successfully');
    } catch (err) {
      alert.handleApiError(err, 'Export failed');
    }
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom'} }
  };

  const renderOverview = () => {
    if (!overview) return null;
    return (
      <div className="reports-grid">
        <Card title="KPI Summary">
          <div className="kpi-grid">
            <div className="kpi-item"><span className="kpi-label">Total Rooms</span><span className="kpi-value">{overview.rooms?.total || 0}</span></div>
            <div className="kpi-item highlight"><span className="kpi-label">Occupancy Rate</span><span className="kpi-value">{overview.rooms?.occupancyRate || 0}%</span></div>
            <div className="kpi-item success"><span className="kpi-label">In-House Guests</span><span className="kpi-value">{overview.guests?.inHouse || 0}</span></div>
            <div className="kpi-item"><span className="kpi-label">New Guests (MTD)</span><span className="kpi-value">{overview.guests?.newThisMonth || 0}</span></div>
            <div className="kpi-item success"><span className="kpi-label">Revenue (MTD)</span><span className="kpi-value">{formatCurrency(overview.revenue?.thisMonth || 0)}</span></div>
            <div className="kpi-item"><span className="kpi-label">Bookings (MTD)</span><span className="kpi-value">{overview.bookings?.thisMonth || 0}</span></div>
            <div className="kpi-item warning"><span className="kpi-label">Avg Rating</span><span className="kpi-value">{overview.feedback?.averageRating || 0}/5</span></div>
            <div className="kpi-item danger"><span className="kpi-label">Open Maint. Tickets</span><span className="kpi-value">{overview.maintenance?.openTickets || 0}</span></div>
          </div>
        </Card>

        <Card title="Today's Quick Stats" icon={<FaCalendarAlt />}>
          <div className="today-stats">
            <div className="today-item"><h3>{overview.bookings?.arrivalsToday || 0}</h3><p>Arrivals Today</p></div>
            <div className="today-item success"><h3>{overview.bookings?.departuresToday || 0}</h3><p>Departures Today</p></div>
            <div className="today-item info"><h3>{overview.bookings?.total || 0}</h3><p>Total Bookings</p></div>
            <div className="today-item warning"><h3>{overview.guests?.total || 0}</h3><p>Total Guests</p></div>
          </div>
        </Card>

        {overview.occupancyLast30 && (
          <Card title="30-Day Occupancy Trend" className="report-chart-card">
            <div style={{ height: '320px' }}>
              <Line
                data={{
                  labels: overview.occupancyLast30.slice(-30).map(d => d._id),
                  datasets: [{
                    label: 'Bookings',
                    data: overview.occupancyLast30.slice(-30).map(d => d.count),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99,102,241,0.1)',
                    fill: true,
                    tension: 0.4
                  }]
                }}
                options={chartOpts}
              />
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderOccupancy = () => {
    if (!occupancy) return null;

    const byTypeData = {
      labels: occupancy.byRoomType?.map(r => r._id?.toUpperCase()) || [],
      datasets: [{
        label: 'Bookings',
        data: occupancy.byRoomType?.map(r => r.bookings) || [],
        backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
      }]
    };

    return (
      <div className="reports-grid">
        <Card title={`Occupancy Statistics (Total Rooms: ${occupancy.totalRooms || 0})`}>
          <div style={{ height: '350px' }}>
            <Bar
              data={{
                labels: occupancy.dailyOccupancy?.slice(-14).map(d => d.date) || [],
                datasets: [
                  {
                    label: 'Rooms Occupied',
                    data: occupancy.dailyOccupancy?.slice(-14).map(d => d.occupied) || [],
                    backgroundColor: '#10b981'
                  },
                  {
                    label: 'Occupancy %',
                    data: occupancy.dailyOccupancy?.slice(-14).map(d => d.rate) || [],
                    backgroundColor: '#6366f1',
                    yAxisID: 'y1'
                  }
                ]
              }}
              options={{
                ...chartOpts,
                scales: {
                  y: { beginAtZero: true, position: 'left' },
                  y1: { beginAtZero: true, max: 100, position: 'right', grid: { drawOnChartArea: false } }
                }
              }}
            />
          </div>
        </Card>

        <Card title="Bookings by Room Type">
          <div style={{ height: '350px' }}>
            <Doughnut data={byTypeData} options={chartOpts} />
          </div>
        </Card>
      </div>
    );
  };

  const renderRevenue = () => {
    if (!revenue) return null;

    const catData = {
      labels: revenue.byCategory?.map(c => c._id?.toUpperCase()) || [],
      datasets: [{
        data: revenue.byCategory?.map(c => c.total) || [],
        backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b']
      }]
    };

    return (
      <div className="reports-grid">
        <Card
          title="Financial Summary"
          actions={<Button variant="outline" icon={<FaDownload />} onClick={() => handleExport('billing')}>Export CSV</Button>}
        >
          <div className="fin-summary">
            <div className="fin-summary-item"><h4>Total Invoiced</h4><h2>{formatCurrency(revenue.summary?.totalInvoiced || 0)}</h2></div>
            <div className="fin-summary-item success"><h4>Total Revenue</h4><h2>{formatCurrency(revenue.summary?.totalRevenue || 0)}</h2></div>
            <div className="fin-summary-item info"><h4># of Invoices</h4><h2>{revenue.summary?.totalInvoices || 0}</h2></div>
            <div className="fin-summary-item warning"><h4>Avg Invoice Value</h4><h2>{formatCurrency(revenue.summary?.avgInvoice || 0)}</h2></div>
          </div>
        </Card>

        <Card title="Revenue Over Time">
          <div style={{ height: '350px' }}>
            <Bar
              data={{
                labels: revenue.byPeriod?.map(p => p._id) || [],
                datasets: [{
                  label: 'Revenue ($)',
                  data: revenue.byPeriod?.map(p => p.revenue) || [],
                  backgroundColor: '#10b981'
                }]
              }}
              options={chartOpts}
            />
          </div>
        </Card>

        <Card title="Revenue by Category">
          <div style={{ height: '350px' }}>
            <Pie data={catData} options={chartOpts} />
          </div>
        </Card>
      </div>
    );
  };

  const renderGuests = () => {
    if (!guestsRpt) return null;
    const demoLabels = guestsRpt.demographics?.map(d => d._id || 'Unknown') || [];
    const demoData = guestsRpt.demographics?.map(d => d.count) || [];
    return (
      <div className="reports-grid">
        <Card title="Guest Demographics">
          <div style={{ height: '350px' }}>
            <Doughnut
              data={{
                labels: demoLabels,
                datasets: [{ data: demoData, backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b', '#ec4899'] }]
              }}
              options={chartOpts}
            />
          </div>
        </Card>

        <Card title={`Top Spenders (Repeat Guests: ${guestsRpt.repeatGuests || 0})`}>
          <div className="top-spenders">
            {guestsRpt.topSpenders?.map((g, i) => (
              <div key={g._id} className="spender-row">
                <span className="spender-rank">#{i + 1}</span>
                <div className="spender-info">
                  <strong>{g.firstName} {g.lastName}</strong>
                  <small>{g.totalStays} stays • {g.loyaltyProgram?.tier || 'no tier'}</small>
                </div>
                <span className="spender-amount">{formatCurrency(g.totalSpent || 0)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Loyalty Program Distribution">
          <div style={{ height: '350px' }}>
            <Bar
              data={{
                labels: guestsRpt.loyaltyStats?.map(l => (l._id || 'none').toUpperCase()) || [],
                datasets: [{
                  label: 'Members',
                  data: guestsRpt.loyaltyStats?.map(l => l.count) || [],
                  backgroundColor: '#6366f1'
                }, {
                  label: 'Total Spent (in $1000s)',
                  data: guestsRpt.loyaltyStats?.map(l => Math.round((l.totalSpent || 0) / 1000)) || [],
                  backgroundColor: '#f59e0b'
                }]
              }}
              options={chartOpts}
            />
          </div>
        </Card>
      </div>
    );
  };

  const renderStaff = () => {
    if (!staffRpt) return null;
    return (
      <div className="reports-grid">
        <Card title={`Staff Distribution (Active: ${staffRpt.activeStaff || 0})`}>
          <div style={{ height: '350px' }}>
            <Doughnut
              data={{
                labels: staffRpt.byRole?.map(r => r._id?.toUpperCase()) || [],
                datasets: [{
                  data: staffRpt.byRole?.map(r => r.count) || [],
                  backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']
                }]
              }}
              options={chartOpts}
            />
          </div>
        </Card>

        <Card title="Recent Staff Logins">
          <div className="staff-logins">
            {staffRpt.recentLogins?.map((s, i) => (
              <div key={s._id} className="login-row">
                <div className="login-avatar">{s.name.charAt(0)}</div>
                <div className="login-info">
                  <strong>{s.name}</strong>
                  <Badge variant="info">{s.role}</Badge>
                </div>
                <small>{new Date(s.lastLogin).toLocaleString()}</small>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  const renderMaint = () => {
    if (!maintRpt) return null;
    return (
      <div className="reports-grid">
        <Card
          title={`Maintenance KPI (Avg Resolution: ${maintRpt.avgResolutionHours || 0} hrs)`}
          subtitle={`Completed this month: ${maintRpt.completedThisMonth || 0}`}
        >
          <div style={{ height: '350px' }}>
            <Bar
              data={{
                labels: maintRpt.byCategory?.map(c => c._id?.toUpperCase()) || [],
                datasets: [
                  { label: 'Total', data: maintRpt.byCategory?.map(c => c.count) || [], backgroundColor: '#6366f1' },
                  { label: 'Completed', data: maintRpt.byCategory?.map(c => c.completed) || [], backgroundColor: '#10b981' }
                ]
              }}
              options={chartOpts}
            />
          </div>
        </Card>

        <Card title="By Priority">
          <div style={{ height: '350px' }}>
            <Doughnut
              data={{
                labels: maintRpt.byPriority?.map(p => p._id?.toUpperCase()) || [],
                datasets: [{
                  data: maintRpt.byPriority?.map(p => p.count) || [],
                  backgroundColor: ['#64748b', '#06b6d4', '#f59e0b', '#ef4444']
                }]
              }}
              options={chartOpts}
            />
          </div>
        </Card>

        <Card title="By Status">
          <div style={{ height: '350px' }}>
            <Pie
              data={{
                labels: maintRpt.byStatus?.map(s => s._id?.replace('_', ' ').toUpperCase()) || [],
                datasets: [{
                  data: maintRpt.byStatus?.map(s => s.count) || [],
                  backgroundColor: ['#f59e0b', '#6366f1', '#06b6d4', '#10b981', '#64748b']
                }]
              }}
              options={chartOpts}
            />
          </div>
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return <div className="loading-center"><Spinner size="lg" /></div>;
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'occupancy': return renderOccupancy();
      case 'revenue': return renderRevenue();
      case 'guests': return renderGuests();
      case 'staff': return renderStaff();
      case 'maintenance': return renderMaint();
      default: return null;
    }
  };

  return (
    <div className="reports-page">
      <Card
        actions={
          <>
            <FormSelect
              value={period}
              onChange={e => setPeriod(e.target.value)}
              options={[
                { value: '7', label: 'Last 7 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'Last 90 days' },
                { value: '365', label: 'Last 12 months' }
              ]}
              style={{ minWidth: '160px' }}
            />
            <Button variant="primary" icon={<FaDownload />} onClick={() => handleExport(activeTab === 'revenue' ? 'billing' : 'bookings')}>Export Report</Button>
          </>
        }
      >
        <div className="report-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`report-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.icon} <span>{t.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {renderContent()}
    </div>
  );
};

export default Reports;
