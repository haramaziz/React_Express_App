import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaCalendarCheck,
  FaFileInvoiceDollar,
  FaBed,
  FaHotel,
  FaCalendarAlt,
  FaDollarSign,
  FaChevronRight,
  FaPlus,
  FaUserCircle
} from 'react-icons/fa';
import { StatCard, Card, Badge, BookingStatusBadge, formatCurrency, formatDate, Spinner, Button } from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';

const GuestDashboard = () => {
  const alert = useAlert();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [billingSummary, setBillingSummary] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bk, bl] = await Promise.all([
        apiService.bookings.getMine().catch(() => ({ data: { data: { bookings: [] } } })),
        apiService.billing.getMine().catch(() => ({ data: { financials: { totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0 }, data: { invoices: [] } } }))
      ]);
      setBookings(bk.data?.data?.bookings || bk.data?.bookings || []);
      setBillingSummary(bl.data?.financials || { totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0 });
    } catch (err) {
      alert.handleApiError(err, 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const upcomingBookings = bookings.filter(b => ['confirmed', 'pending', 'checked_in'].includes(b.status)).slice(0, 3);
  const staysTotal = bookings.filter(b => b.status === 'checked_out').length;
  const nextStay = upcomingBookings[0];

  if (loading) {
    return (
      <div className="loading-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="guest-dashboard">
      <Card className="welcome-card" style={{ background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', color: 'white', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 'bold'
          }}>
            {user?.name?.charAt(0) || 'G'}
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>
              Welcome back, {user?.name?.split(' ')[0] || 'Guest'}!
            </h2>
            <p style={{ opacity: '0.9', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
              We're delighted to have you with LuxuryStay. You have {upcomingBookings.length} upcoming stay(s).
            </p>
          </div>
          <Button
            variant="ghost"
            className="btn-white-outline"
            onClick={() => navigate('/guest/bookings')}
            icon={<FaPlus />}
          >
            Book New Stay
          </Button>
        </div>
      </Card>

      <div className="stats-grid" style={{ marginTop: '1.5rem' }}>
        <StatCard
          title="Upcoming Stays"
          value={upcomingBookings.length}
          subtitle="Confirmed reservations"
          icon={<FaCalendarCheck />}
          color="primary"
        />
        <StatCard
          title="Total Stays"
          value={staysTotal}
          subtitle="Completed visits"
          icon={<FaHotel />}
          color="success"
        />
        <StatCard
          title="Total Paid"
          value={formatCurrency(billingSummary?.totalPaid || 0)}
          subtitle="Lifetime spending"
          icon={<FaDollarSign />}
          color="warning"
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(billingSummary?.totalOutstanding || 0)}
          subtitle="Due invoices"
          icon={<FaFileInvoiceDollar />}
          color={billingSummary?.totalOutstanding > 0 ? 'danger' : 'info'}
        />
      </div>

      <div className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
        <Card
          title="Next Upcoming Stay"
          subtitle={nextStay ? `Booking #${nextStay.bookingReference}` : 'No upcoming stays'}
          actions={
            <Link to="/guest/bookings" className="btn-link">
              View all <FaChevronRight />
            </Link>
          }
        >
          {!nextStay ? (
            <div className="empty-state">
              <FaCalendarAlt className="empty-icon" />
              <p style={{ marginBottom: '1rem' }}>No upcoming stays scheduled.</p>
              <Button variant="primary" size="sm" icon={<FaBed />} onClick={() => navigate('/rooms')}>
                Browse Rooms
              </Button>
            </div>
          ) : (
            <div className="next-stay-card">
              <div className="next-stay-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="stay-room-badge">
                    <FaBed /> {nextStay.room?.roomNumber}
                  </div>
                  <div>
                    <h4 style={{ margin: 0 }}>
                      {nextStay.room?.roomType?.charAt(0).toUpperCase() + (nextStay.room?.roomType || 'room').slice(1)}
                    </h4>
                    <small style={{ color: 'var(--text-secondary)' }}>
                      {nextStay.room?.bedType || 'Standard'} • Floor {nextStay.room?.floor || '?'}
                    </small>
                  </div>
                </div>
                <BookingStatusBadge status={nextStay.status} />
              </div>
              <div className="stay-dates">
                <div>
                  <span className="stay-label">Check-in</span>
                  <strong>{formatDate(nextStay.checkIn, 'full')}</strong>
                </div>
                <div className="stay-arrow">→</div>
                <div>
                  <span className="stay-label">Check-out</span>
                  <strong>{formatDate(nextStay.checkOut, 'full')}</strong>
                </div>
              </div>
              <div className="stay-footer">
                <Badge variant="info">{nextStay.numAdults || 1} Adult(s) • {nextStay.numChildren || 0} Children</Badge>
                <strong style={{ fontSize: '1.1rem' }}>{formatCurrency(nextStay.totalAmount)}</strong>
              </div>
            </div>
          )}
        </Card>

        <Card
          title="Billing Overview"
          actions={
            <Link to="/guest/billing" className="btn-link">
              View invoices <FaChevronRight />
            </Link>
          }
        >
          {billingSummary?.totalInvoiced > 0 ? (
            <div className="billing-summary-guest">
              <div className="billing-row">
                <span>Total Invoiced</span>
                <strong>{formatCurrency(billingSummary.totalInvoiced)}</strong>
              </div>
              <div className="billing-row">
                <span>Amount Paid</span>
                <strong style={{ color: 'var(--success)' }}>{formatCurrency(billingSummary.totalPaid)}</strong>
              </div>
              <div className="billing-row balance">
                <span>Balance Due</span>
                <strong style={{ color: billingSummary.totalOutstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {formatCurrency(billingSummary.totalOutstanding)}
                </strong>
              </div>
              {billingSummary.totalOutstanding > 0 && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', borderLeft: '3px solid var(--danger)' }}>
                  <strong style={{ color: 'var(--danger)' }}>⚠️ Outstanding Balance</strong>
                  <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
                    Please settle the due amount at the front desk or contact reception.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <FaFileInvoiceDollar className="empty-icon" />
              <p>No invoices yet. Your first invoice will appear here after booking.</p>
            </div>
          )}
        </Card>
      </div>

      <div className="quick-actions-guest" style={{ marginTop: '1.5rem' }}>
        <Link to="/rooms" className="quick-action-card">
          <FaBed className="quick-action-icon primary" />
          <div>
            <h4>Book a Room</h4>
            <p>Browse available rooms and reserve your perfect stay</p>
          </div>
          <FaChevronRight className="quick-action-arrow" />
        </Link>
        <Link to="/guest/bookings" className="quick-action-card">
          <FaCalendarAlt className="quick-action-icon success" />
          <div>
            <h4>My Bookings</h4>
            <p>View, manage, or cancel your reservations</p>
          </div>
          <FaChevronRight className="quick-action-arrow" />
        </Link>
        <Link to="/guest/billing" className="quick-action-card">
          <FaFileInvoiceDollar className="quick-action-icon warning" />
          <div>
            <h4>My Invoices</h4>
            <p>Review billing statements and payment history</p>
          </div>
          <FaChevronRight className="quick-action-arrow" />
        </Link>
        <Link to="/guest/profile" className="quick-action-card">
          <FaUserCircle className="quick-action-icon info" />
          <div>
            <h4>My Profile</h4>
            <p>Update contact info and preferences</p>
          </div>
          <FaChevronRight className="quick-action-arrow" />
        </Link>
      </div>
    </div>
  );
};

export default GuestDashboard;
