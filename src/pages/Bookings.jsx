import { useState, useEffect } from 'react';
import {
  FaPlus, FaSearch, FaCalendarAlt, FaCheck, FaSignOutAlt,
  FaTimes, FaEye, FaEdit, FaFilter
} from 'react-icons/fa';
import {
  Card, Button, DataTable, Modal, FormInput, FormSelect, FormTextarea,
  Badge, Spinner, BookingStatusBadge, RoomStatusBadge, formatCurrency, formatDate
} from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';

const Bookings = () => {
  const alert = useAlert();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', bookingSource: '', search: '' });
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewBooking, setViewBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [guestSuggestions, setGuestSuggestions] = useState([]);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [form, setForm] = useState({
    guest: '', guestName: '', room: '', checkIn: today, checkOut: tomorrow,
    numAdults: 2, numChildren: 0, bookingSource: 'walk_in',
    baseRate: '', taxRate: 10, discountAmount: 0,
    specialRequests: '', paymentMethod: 'credit_card', paymentAmount: ''
  });

  useEffect(() => { loadBookings(); }, [filters]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.bookingSource) params.bookingSource = filters.bookingSource;
      if (filters.search) params.search = filters.search;
      const res = await apiService.bookings.getAll(params);
      setBookings(res.data.data.bookings);
      setStats(res.data.stats || {});
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableRooms = async () => {
    try {
      const res = await apiService.rooms.getAvailable();
      setAvailableRooms(res.data.data.rooms);
    } catch (e) {
      // silent
    }
  };

  const searchGuests = async (q) => {
    if (!q || q.length < 2) {
      setGuestSuggestions([]);
      return;
    }
    try {
      const res = await apiService.guests.search(q, 8);
      setGuestSuggestions(res.data.data.guests);
      setShowGuestDropdown(true);
    } catch (e) {
      setGuestSuggestions([]);
    }
  };

  const selectGuest = (guest) => {
    setForm({ ...form, guest: guest._id, guestName: `${guest.firstName} ${guest.lastName}` });
    setGuestSearch(`${guest.firstName} ${guest.lastName}`);
    setShowGuestDropdown(false);
    setGuestSuggestions([]);
  };

  const handleAdd = () => {
    loadAvailableRooms();
    setForm({
      guest: '', guestName: '', room: '', checkIn: today, checkOut: tomorrow,
      numAdults: 2, numChildren: 0, bookingSource: 'walk_in',
      baseRate: '', taxRate: 10, discountAmount: 0,
      specialRequests: '', paymentMethod: 'credit_card', paymentAmount: ''
    });
    setGuestSearch('');
    setShowModal(true);
  };

  const handleRoomSelect = (roomId) => {
    const room = availableRooms.find(r => r._id === roomId);
    const nights = Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000);
    const baseRate = room ? room.pricePerNight * (nights || 1) : 0;
    setForm({ ...form, room: roomId, baseRate: baseRate.toString() });
  };

  const calculateTotal = () => {
    const base = Number(form.baseRate) || 0;
    const tax = base * ((Number(form.taxRate) || 10) / 100);
    const discount = Number(form.discountAmount) || 0;
    return base + tax - discount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.guest) { alert.error('Please select a guest'); return; }
    if (!form.room) { alert.error('Please select a room'); return; }

    try {
      setSubmitting(true);
      const total = calculateTotal();
      const payload = {
        guest: form.guest,
        room: form.room,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        numAdults: Number(form.numAdults),
        numChildren: Number(form.numChildren),
        bookingSource: form.bookingSource,
        baseRate: Number(form.baseRate),
        discountAmount: Number(form.discountAmount),
        taxRate: Number(form.taxRate),
        specialRequests: form.specialRequests,
        paymentMethod: form.paymentMethod
      };

      if (form.paymentAmount && Number(form.paymentAmount) > 0) {
        payload.paidAmount = Number(form.paymentAmount);
        if (Number(form.paymentAmount) >= total) payload.paymentStatus = 'paid';
        else payload.paymentStatus = 'partial';
      }

      await apiService.bookings.create(payload);
      alert.success('Booking created successfully!');
      setShowModal(false);
      loadBookings();
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async (booking) => {
    try {
      await apiService.bookings.checkIn(booking._id);
      alert.success(`Checked in: ${booking.guest?.firstName} ${booking.guest?.lastName}`);
      loadBookings();
    } catch (e) {
      alert.handleApiError(e);
    }
  };

  const handleCheckOut = async (booking) => {
    if (booking.balanceDue > 0) {
      if (!window.confirm(`Outstanding balance of ${formatCurrency(booking.balanceDue)}. Continue check-out?`)) return;
    } else if (!window.confirm('Confirm check-out?')) {
      return;
    }
    try {
      await apiService.bookings.checkOut(booking._id);
      alert.success('Check-out completed successfully');
      loadBookings();
    } catch (e) {
      alert.handleApiError(e);
    }
  };

  const handleCancel = async (booking) => {
    const reason = prompt('Please enter cancellation reason:');
    if (reason === null) return;
    try {
      await apiService.bookings.cancel(booking._id, reason || 'No reason');
      alert.success('Booking cancelled');
      loadBookings();
    } catch (e) {
      alert.handleApiError(e);
    }
  };

  const handleView = async (booking) => {
    try {
      const res = await apiService.bookings.getById(booking._id);
      setViewBooking(res.data.data.booking);
      setShowView(true);
    } catch (e) {
      alert.handleApiError(e);
    }
  };

  const columns = [
    { key: 'bookingReference', label: 'Ref #', render: v => <strong style={{ color: '#6366f1' }}>{v}</strong> },
    {
      key: 'guest',
      label: 'Guest',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.guest?.firstName} {r.guest?.lastName}</div>
          <small style={{ color: '#6b7280' }}>{r.guest?.phone}</small>
        </div>
      )
    },
    { key: 'room', label: 'Room', render: v => v ? `${v.roomNumber} (${v.roomType})` : '-' },
    { key: 'checkIn', label: 'Check-in', render: v => formatDate(v) },
    { key: 'checkOut', label: 'Check-out', render: v => formatDate(v) },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{formatCurrency(v)}</div>
          {r.balanceDue > 0 && <small style={{ color: '#ef4444' }}>Owed: {formatCurrency(r.balanceDue)}</small>}
        </div>
      )
    },
    { key: 'status', label: 'Status', render: v => <BookingStatusBadge status={v} /> }
  ];

  const actions = [
    { label: 'View', icon: <FaEye />, variant: 'default', onClick: handleView },
    {
      label: 'Check-in',
      icon: <FaCheck />,
      variant: 'success',
      onClick: handleCheckIn,
      disabled: r => r.status !== 'confirmed'
    },
    {
      label: 'Check-out',
      icon: <FaSignOutAlt />,
      variant: 'primary',
      onClick: handleCheckOut,
      disabled: r => r.status !== 'checked_in'
    },
    {
      label: 'Cancel',
      icon: <FaTimes />,
      variant: 'danger',
      onClick: handleCancel,
      disabled: r => ['cancelled', 'checked_out'].includes(r.status)
    }
  ];

  const totalAmount = calculateTotal();

  return (
    <div className="bookings-page">
      <Card
        title="All Bookings"
        subtitle={`${stats.total || 0} total • ${stats.arrivalsToday || 0} arrivals today • ${stats.departuresToday || 0} departures today`}
        actions={
          <>
            <div className="mini-stats-row">
              <Badge variant="primary">{stats.inHouse || 0} In-House</Badge>
              <Badge variant="info">{stats.confirmed || 0} Confirmed</Badge>
              <Badge variant="danger">{stats.cancelled || 0} Cancelled</Badge>
            </div>
            <Button variant="primary" icon={<FaPlus />} onClick={handleAdd}>New Booking</Button>
          </>
        }
      >
        <div className="filter-bar">
          <FormSelect
            placeholder="All Status"
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
            options={['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'].map(s => ({ value: s, label: s.replace('_', ' ').toUpperCase() }))}
          />
          <FormSelect
            placeholder="All Sources"
            value={filters.bookingSource}
            onChange={e => setFilters({ ...filters, bookingSource: e.target.value })}
            options={['walk_in', 'phone', 'online', 'third_party', 'corporate'].map(s => ({ value: s, label: s.replace('_', ' ').toUpperCase() }))}
          />
          <div style={{ flex: 1 }}>
            <FormInput
              placeholder="Search by ref, guest name, phone..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
        </div>

        {loading ? <div className="loading-center"><Spinner /></div> : (
          <DataTable columns={columns} data={bookings} actions={actions} emptyMessage="No bookings found" />
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Booking"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Create Booking'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <h4 style={{ marginBottom: '1rem', color: '#6366f1' }}>Guest Information</h4>
          <div className="form-grid-2">
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Search Guest <span className="required">*</span></label>
              <FormInput
                placeholder="Search by name, phone, email..."
                value={guestSearch}
                onChange={e => { setGuestSearch(e.target.value); searchGuests(e.target.value); }}
              />
              {showGuestDropdown && guestSuggestions.length > 0 && (
                <div className="dropdown-suggestions" onBlur={() => setTimeout(() => setShowGuestDropdown(false), 200)}>
                  {guestSuggestions.map(g => (
                    <div key={g._id} className="suggestion-item" onClick={() => selectGuest(g)}>
                      <strong>{g.firstName} {g.lastName}</strong>
                      <small>{g.phone} • {g.nationality || ''}</small>
                    </div>
                  ))}
                </div>
              )}
              {form.guestName && <small style={{ color: '#10b981' }}>✓ Selected: {form.guestName}</small>}
            </div>
            <div></div>
          </div>

          <h4 style={{ margin: '1.5rem 0 1rem', color: '#6366f1' }}>Room & Dates</h4>
          <div className="form-grid-2">
            <FormSelect
              label="Select Room"
              value={form.room}
              onChange={e => handleRoomSelect(e.target.value)}
              required
              options={availableRooms.map(r => ({
                value: r._id,
                label: `Room ${r.roomNumber} - ${r.roomType.toUpperCase()} (${formatCurrency(r.pricePerNight)}/night)`
              }))}
            />
            <div></div>
            <FormInput label="Check-in Date" type="date" value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })} required />
            <FormInput label="Check-out Date" type="date" value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })} required />
            <FormInput label="Adults" type="number" value={form.numAdults} onChange={e => setForm({ ...form, numAdults: e.target.value })} />
            <FormInput label="Children" type="number" value={form.numChildren} onChange={e => setForm({ ...form, numChildren: e.target.value })} />
          </div>

          <h4 style={{ margin: '1.5rem 0 1rem', color: '#6366f1' }}>Payment Details</h4>
          <div className="form-grid-2">
            <FormInput label="Base Rate ($)" type="number" value={form.baseRate} onChange={e => setForm({ ...form, baseRate: e.target.value })} />
            <FormInput label="Tax Rate (%)" type="number" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })} />
            <FormInput label="Discount ($)" type="number" value={form.discountAmount} onChange={e => setForm({ ...form, discountAmount: e.target.value })} />
            <FormSelect label="Payment Method" value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} options={['cash', 'credit_card', 'debit_card', 'bank_transfer', 'online', 'check']} />
            <FormSelect label="Booking Source" value={form.bookingSource} onChange={e => setForm({ ...form, bookingSource: e.target.value })} options={['walk_in', 'phone', 'online', 'third_party', 'corporate']} />
            <FormInput label="Initial Payment ($)" type="number" value={form.paymentAmount} onChange={e => setForm({ ...form, paymentAmount: e.target.value })} placeholder="Leave blank for no payment" />
          </div>

          <div className="booking-summary">
            <div className="summary-row"><span>Base Rate</span><span>{formatCurrency(form.baseRate)}</span></div>
            <div className="summary-row"><span>Tax ({form.taxRate}%)</span><span>{formatCurrency((Number(form.baseRate) || 0) * ((Number(form.taxRate) || 10) / 100))}</span></div>
            <div className="summary-row"><span>Discount</span><span>-{formatCurrency(form.discountAmount)}</span></div>
            <div className="summary-row total"><span>Total Amount</span><span>{formatCurrency(totalAmount)}</span></div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <FormTextarea label="Special Requests / Notes" value={form.specialRequests} onChange={e => setForm({ ...form, specialRequests: e.target.value })} />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showView}
        onClose={() => setShowView(false)}
        title={`Booking ${viewBooking?.bookingReference}`}
        size="lg"
      >
        {viewBooking && (
          <div className="booking-details">
            <div className="detail-header">
              <div>
                <h2>{viewBooking.guest?.firstName} {viewBooking.guest?.lastName}</h2>
                <p style={{ color: '#6b7280' }}>{viewBooking.guest?.phone} • {viewBooking.guest?.email}</p>
              </div>
              <BookingStatusBadge status={viewBooking.status} />
            </div>

            <div className="detail-grid">
              <div className="detail-block">
                <h4>Room Information</h4>
                <p><strong>Room:</strong> {viewBooking.room?.roomNumber} - {viewBooking.room?.roomType?.toUpperCase()}</p>
                <p><strong>Floor:</strong> {viewBooking.room?.floor}</p>
                <p><strong>Occupancy:</strong> {viewBooking.numAdults} Adults, {viewBooking.numChildren} Children</p>
              </div>
              <div className="detail-block">
                <h4>Stay Information</h4>
                <p><strong>Check-in:</strong> {formatDate(viewBooking.checkIn, 'full')}</p>
                <p><strong>Check-out:</strong> {formatDate(viewBooking.checkOut, 'full')}</p>
                <p><strong>Source:</strong> {viewBooking.bookingSource?.replace('_', ' ')}</p>
              </div>
              <div className="detail-block">
                <h4>Financial Summary</h4>
                <p><strong>Base Rate:</strong> {formatCurrency(viewBooking.baseRate)}</p>
                <p><strong>Tax:</strong> {formatCurrency(viewBooking.taxAmount)}</p>
                <p><strong>Discount:</strong> {formatCurrency(viewBooking.discountAmount)}</p>
                <p><strong>Total:</strong> {formatCurrency(viewBooking.totalAmount)}</p>
                <p><strong>Paid:</strong> {formatCurrency(viewBooking.paidAmount)}</p>
                <p className={viewBooking.balanceDue > 0 ? 'text-danger' : 'text-success'}>
                  <strong>Balance:</strong> {formatCurrency((viewBooking.totalAmount || 0) - (viewBooking.paidAmount || 0))}
                </p>
              </div>
              <div className="detail-block">
                <h4>Dates</h4>
                <p><strong>Created:</strong> {formatDate(viewBooking.createdAt, 'full')}</p>
                {viewBooking.checkedInAt && <p><strong>Checked In:</strong> {formatDate(viewBooking.checkedInAt, 'full')}</p>}
                {viewBooking.checkedOutAt && <p><strong>Checked Out:</strong> {formatDate(viewBooking.checkedOutAt, 'full')}</p>}
                {viewBooking.cancelledAt && (
                  <>
                    <p><strong>Cancelled At:</strong> {formatDate(viewBooking.cancelledAt, 'full')}</p>
                    <p><strong>Reason:</strong> {viewBooking.cancellationReason}</p>
                  </>
                )}
              </div>
            </div>

            {viewBooking.specialRequests && (
              <div className="detail-section">
                <h4>Special Requests</h4>
                <p>{viewBooking.specialRequests}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Bookings;
