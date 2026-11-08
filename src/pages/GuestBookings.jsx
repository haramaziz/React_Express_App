import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaCalendarPlus,
  FaBed,
  FaCalendarAlt,
  FaBan,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaArrowRight,
  FaSpinner
} from 'react-icons/fa';
import {
  Card,
  Badge,
  BookingStatusBadge,
  RoomStatusBadge,
  formatCurrency,
  formatDate,
  Spinner,
  Button,
  Modal,
  FormInput,
  FormSelect,
  DataTable
} from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';

const GuestBookings = () => {
  const alert = useAlert();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');

  const [showBookModal, setShowBookModal] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [bookingForm, setBookingForm] = useState({
    room: '',
    checkIn: '',
    checkOut: '',
    numAdults: 1,
    numChildren: 0,
    specialRequests: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await apiService.bookings.getMine();
      setBookings(res.data?.data?.bookings || res.data?.bookings || []);
    } catch (err) {
      alert.handleApiError(err, 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (booking) => {
    if (!window.confirm(`Are you sure you want to cancel booking ${booking.bookingReference}?`)) {
      return;
    }
    try {
      await apiService.bookings.cancel(booking._id, 'Guest requested cancellation');
      alert.success('Booking cancelled successfully');
      await loadBookings();
    } catch (err) {
      alert.handleApiError(err, 'Failed to cancel booking');
    }
  };

  const openBookModal = async () => {
    try {
      setRoomsLoading(true);
      setShowBookModal(true);
      const res = await apiService.rooms.getPublic();
      const allRooms = res.data?.data?.rooms || res.data?.rooms || [];
      setAvailableRooms(allRooms.filter(r => r.status === 'available'));
    } catch (err) {
      alert.handleApiError(err, 'Failed to load available rooms');
    } finally {
      setRoomsLoading(false);
    }
  };

  const validateBookingDates = () => {
    const { checkIn, checkOut } = bookingForm;
    if (!checkIn || !checkOut) {
      alert.warning('Please select check-in and check-out dates');
      return false;
    }
    if (new Date(checkIn) < new Date(today)) {
      alert.warning('Check-in date cannot be in the past');
      return false;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      alert.warning('Check-out must be after check-in');
      return false;
    }
    if (!bookingForm.room) {
      alert.warning('Please select a room');
      return false;
    }
    return true;
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!validateBookingDates()) return;

    try {
      setSubmitting(true);
      await apiService.bookings.createGuest({
        room: bookingForm.room,
        checkIn: bookingForm.checkIn,
        checkOut: bookingForm.checkOut,
        numAdults: Number(bookingForm.numAdults),
        numChildren: Number(bookingForm.numChildren),
        specialRequests: bookingForm.specialRequests
      });
      alert.success('Booking created successfully!');
      setShowBookModal(false);
      setBookingForm({ room: '', checkIn: '', checkOut: '', numAdults: 1, numChildren: 0, specialRequests: '' });
      await loadBookings();
    } catch (err) {
      alert.handleApiError(err, 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return ['confirmed', 'pending', 'checked_in'].includes(b.status);
    if (filter === 'past') return ['checked_out', 'cancelled', 'no_show'].includes(b.status);
    return true;
  });

  const columns = [
    { key: 'bookingReference', label: 'Ref #', render: v => <strong>{v}</strong> },
    { key: 'room', label: 'Room', render: (v, r) => `${v?.roomNumber || '-'} ${v?.roomType ? `(${v.roomType})` : ''}` },
    { key: 'checkIn', label: 'Check-in', render: v => formatDate(v, 'short') },
    { key: 'checkOut', label: 'Check-out', render: v => formatDate(v, 'short') },
    {
      key: 'guests',
      label: 'Guests',
      render: (_, r) => `${r.numAdults || 1}A ${r.numChildren ? `· ${r.numChildren}C` : ''}`
    },
    { key: 'totalAmount', label: 'Total', render: v => formatCurrency(v) },
    { key: 'status', label: 'Status', render: v => <BookingStatusBadge status={v} /> }
  ];

  return (
    <div className="guest-bookings">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="booking-tabs">
          {[
            { key: 'all', label: 'All Bookings' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'past', label: 'Past' }
          ].map(tab => (
            <button
              key={tab.key}
              className={`booking-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/rooms" className="btn btn-outline">
            <FaBed /> Browse All Rooms
          </Link>
          <Button variant="primary" icon={<FaCalendarPlus />} onClick={openBookModal}>
            New Booking
          </Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="loading-center"><Spinner size="lg" /></div>
        ) : (
          <>
            {filteredBookings.length === 0 ? (
              <div className="empty-state">
                <FaCalendarAlt className="empty-icon" />
                <p style={{ marginBottom: '1rem' }}>
                  {filter === 'all' ? 'You have no bookings yet.' : `No ${filter} bookings found.`}
                </p>
                <Button variant="primary" size="sm" icon={<FaCalendarPlus />} onClick={openBookModal}>
                  Book Your First Stay
                </Button>
              </div>
            ) : (
              <DataTable
                columns={[
                  ...columns,
                  {
                    key: '_actions',
                    label: 'Actions',
                    width: '140px'
                  }
                ]}
                data={filteredBookings.map(b => ({
                  ...b,
                  _actions: null
                }))}
                emptyMessage="No bookings found"
                actions={
                  filteredBookings.some(b => ['confirmed', 'pending'].includes(b.status))
                    ? [{
                      label: 'Cancel',
                      variant: 'danger',
                      icon: <FaBan />,
                      onClick: (row) => handleCancel(row),
                      disabled: (row) => !['confirmed', 'pending'].includes(row.status)
                    }]
                    : null
                }
              />
            )}
          </>
        )}
      </Card>

      {filteredBookings.length > 0 && (
        <div className="booking-legend" style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaInfoCircle style={{ color: 'var(--info)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Upcoming bookings may be cancelled before check-in.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaCheckCircle style={{ color: 'var(--success)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Checked-out bookings are kept for your history.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaTimesCircle style={{ color: 'var(--danger)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Cancellation policy applies. Please contact reception for special cases.
            </span>
          </div>
        </div>
      )}

      <Modal
        isOpen={showBookModal}
        onClose={() => !submitting && setShowBookModal(false)}
        title="Book a New Stay"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowBookModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateBooking}
              icon={submitting ? <Spinner size="sm" /> : <FaCalendarPlus />}
              disabled={submitting}
            >
              {submitting ? 'Processing...' : 'Confirm Booking'}
            </Button>
          </>
        }
      >
        {roomsLoading ? (
          <div className="loading-center" style={{ minHeight: '200px' }}><Spinner /></div>
        ) : (
          <form onSubmit={handleCreateBooking} className="booking-form">
            <div className="form-row">
              <FormInput
                label="Check-in Date"
                name="checkIn"
                type="date"
                value={bookingForm.checkIn}
                onChange={e => setBookingForm(f => ({ ...f, checkIn: e.target.value }))}
                required
                placeholder={today}
              />
              <FormInput
                label="Check-out Date"
                name="checkOut"
                type="date"
                value={bookingForm.checkOut}
                onChange={e => setBookingForm(f => ({ ...f, checkOut: e.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <FormInput
                label="Adults"
                name="numAdults"
                type="number"
                min="1"
                max="10"
                value={bookingForm.numAdults}
                onChange={e => setBookingForm(f => ({ ...f, numAdults: e.target.value }))}
                required
              />
              <FormInput
                label="Children"
                name="numChildren"
                type="number"
                min="0"
                max="10"
                value={bookingForm.numChildren}
                onChange={e => setBookingForm(f => ({ ...f, numChildren: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Select Room <span className="required">*</span></label>
              {availableRooms.length === 0 ? (
                <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', borderLeft: '3px solid var(--warning)' }}>
                  <strong style={{ color: 'var(--warning)' }}>⚠️ No Available Rooms</strong>
                  <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
                    Sorry, there are no rooms available for booking at this time. Please try again later or contact reception.
                  </p>
                </div>
              ) : (
                <div className="available-rooms-grid">
                  {availableRooms.map(room => (
                    <label
                      key={room._id}
                      className={`room-option ${bookingForm.room === room._id ? 'selected' : ''}`}
                      onClick={() => setBookingForm(f => ({ ...f, room: room._id }))}
                    >
                      <input
                        type="radio"
                        name="room"
                        value={room._id}
                        checked={bookingForm.room === room._id}
                        onChange={() => {}}
                        style={{ display: 'none' }}
                      />
                      <div className="room-option-header">
                        <div>
                          <strong>Room {room.roomNumber}</strong>
                          <small style={{ display: 'block', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                            {room.roomType || 'Standard'}
                          </small>
                        </div>
                        <RoomStatusBadge status={room.status} />
                      </div>
                      <div className="room-option-meta">
                        <span>{room.bedType || 'N/A'}</span>
                        <span>
                          {room.capacity?.adults || 2} Adults{room.capacity?.children ? ` · ${room.capacity.children} Children` : ''}
                        </span>
                      </div>
                      {room.amenities?.length > 0 && (
                        <div className="room-amenities">
                          {room.amenities.slice(0, 4).map((a, i) => (
                            <span key={i} className="amenity-tag">{a}</span>
                          ))}
                        </div>
                      )}
                      <div className="room-option-footer">
                        <span className="room-option-price">{formatCurrency(room.pricePerNight)}<small>/night</small></span>
                        <FaArrowRight className="room-option-check" />
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Special Requests (Optional)</label>
              <textarea
                name="specialRequests"
                className="form-textarea"
                rows="3"
                placeholder="Any special requests? E.g. high floor, non-smoking, extra bed..."
                value={bookingForm.specialRequests}
                onChange={e => setBookingForm(f => ({ ...f, specialRequests: e.target.value }))}
              />
            </div>
            {bookingForm.room && bookingForm.checkIn && bookingForm.checkOut && new Date(bookingForm.checkOut) > new Date(bookingForm.checkIn) && (() => {
              const room = availableRooms.find(r => r._id === bookingForm.room);
              const nights = Math.ceil((new Date(bookingForm.checkOut) - new Date(bookingForm.checkIn)) / (1000 * 60 * 60 * 24));
              const base = (room?.pricePerNight || 0) * nights;
              const tax = base * 0.1;
              return (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Booking Summary</h4>
                  <div className="billing-row"><span>Room Rate ({nights} night{nights !== 1 ? 's' : ''})</span><span>{formatCurrency(base)}</span></div>
                  <div className="billing-row"><span>Taxes &amp; Fees (10%)</span><span>{formatCurrency(tax)}</span></div>
                  <div className="billing-row balance"><span>Estimated Total</span><strong>{formatCurrency(base + tax)}</strong></div>
                </div>
              );
            })()}
          </form>
        )}
      </Modal>
    </div>
  );
};

export default GuestBookings;
