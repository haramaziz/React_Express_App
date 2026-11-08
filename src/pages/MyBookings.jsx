import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaCalendarPlus, FaBan, FaBed } from 'react-icons/fa';
import {
  Card,
  BookingStatusBadge,
  formatCurrency,
  formatDate,
  Spinner,
  Button
} from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';

const MyBookings = () => {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await apiService.bookings.getMine();
      setBookings(res.data?.data?.bookings || []);
    } catch (err) {
      alert.handleApiError(err, 'Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (booking) => {
    if (!window.confirm(`Cancel booking ${booking.bookingReference}?`)) return;
    try {
      await apiService.bookings.cancel(booking._id, 'Guest requested cancellation');
      alert.success('Booking cancelled successfully');
      await loadBookings();
    } catch (err) {
      alert.handleApiError(err, 'Failed to cancel booking');
    }
  };

  const filtered = bookings.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return ['pending', 'confirmed'].includes(b.status);
    if (filter === 'active') return b.status === 'checked_in';
    if (filter === 'past') return ['checked_out', 'cancelled', 'no_show'].includes(b.status);
    return true;
  });

  if (loading) {
    return <div className="loading-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="public-section my-bookings-page">
      <div className="section-header left">
        <div>
          <h1 className="section-title">My Bookings</h1>
          <p className="section-subtitle">Review upcoming stays, active visits, and past reservations</p>
        </div>
        <Link to="/rooms" className="btn btn-primary">
          <FaCalendarPlus /> Book a Room
        </Link>
      </div>

      <div className="booking-filters">
        {[
          { id: 'all', label: 'All' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'active', label: 'Active' },
          { id: 'past', label: 'Past' }
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            className={`filter-chip ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div className="empty-state">
            <FaBed className="empty-icon" />
            <p>No bookings in this category yet.</p>
            <Link to="/rooms" className="btn btn-primary">Browse Rooms</Link>
          </div>
        </Card>
      ) : (
        <div className="booking-list">
          {filtered.map((booking) => (
            <Card key={booking._id} className="booking-card">
              <div className="booking-card-top">
                <div>
                  <h3>{booking.bookingReference}</h3>
                  <p>
                    {booking.room?.name || `Room ${booking.room?.roomNumber || '—'}`}
                    {booking.room?.roomType ? ` · ${booking.room.roomType}` : ''}
                  </p>
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>
              <div className="booking-card-meta">
                <div>
                  <span>Check-in</span>
                  <strong>{formatDate(booking.checkIn)}</strong>
                </div>
                <div>
                  <span>Check-out</span>
                  <strong>{formatDate(booking.checkOut)}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatCurrency(booking.totalAmount)}</strong>
                </div>
                <div>
                  <span>Payment</span>
                  <strong>{booking.paymentStatus || 'unpaid'}</strong>
                </div>
              </div>
              <div className="booking-card-actions">
                {booking.room?._id && (
                  <Link to={`/rooms/${booking.room._id}`} className="btn btn-outline btn-sm">View Room</Link>
                )}
                {['pending', 'confirmed'].includes(booking.status) && (
                  <Button variant="danger" size="sm" icon={<FaBan />} onClick={() => handleCancel(booking)}>
                    Cancel
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
