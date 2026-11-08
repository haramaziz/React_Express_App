import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaBed,
  FaUsers,
  FaRulerCombined,
  FaEye,
  FaCheckCircle,
  FaCalendarCheck,
  FaHotel
} from 'react-icons/fa';
import {
  formatCurrency,
  Spinner,
  RoomStatusBadge,
  Button,
  Modal,
  FormInput,
  FormSelect,
  FormTextarea
} from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';
import { getRoomCover } from '../utils/media';
import { RoomGallery } from '../components/RoomMedia';

const RoomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const alert = useAlert();
  const { isAuthenticated, isGuest } = useAuth();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBook, setShowBook] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [checking, setChecking] = useState(false);
  const [form, setForm] = useState({
    checkIn: '',
    checkOut: '',
    numAdults: 1,
    numChildren: 0,
    specialRequests: ''
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadRoom();
  }, [id]);

  const loadRoom = async () => {
    try {
      setLoading(true);
      const res = await apiService.rooms.getPublicById(id);
      setRoom(res.data?.data?.room || null);
    } catch (err) {
      alert.handleApiError(err, 'Failed to load room details');
      setRoom(null);
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async () => {
    if (!form.checkIn || !form.checkOut) {
      alert.error('Select check-in and check-out dates');
      return;
    }
    if (new Date(form.checkOut) <= new Date(form.checkIn)) {
      alert.error('Check-out must be after check-in');
      return;
    }
    try {
      setChecking(true);
      const res = await apiService.rooms.checkPublicAvailability(room._id, {
        checkIn: form.checkIn,
        checkOut: form.checkOut
      });
      const ok = !!res.data?.data?.available;
      setAvailability(ok);
      if (ok) alert.success('Room is available for your dates');
      else alert.warning('This room is not available for the selected dates');
    } catch (err) {
      alert.handleApiError(err, 'Availability check failed');
    } finally {
      setChecking(false);
    }
  };

  const openBooking = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/rooms/${id}`);
      return;
    }
    if (!isGuest()) {
      alert.info('Please use a guest account to book online');
      return;
    }
    setShowBook(true);
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!form.checkIn || !form.checkOut) {
      alert.error('Please select stay dates');
      return;
    }
    if (new Date(form.checkOut) <= new Date(form.checkIn)) {
      alert.error('Check-out must be after check-in');
      return;
    }
    try {
      setSubmitting(true);
      const res = await apiService.bookings.createGuest({
        room: room._id,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        numAdults: Number(form.numAdults) || 1,
        numChildren: Number(form.numChildren) || 0,
        specialRequests: form.specialRequests
      });
      alert.success(`Booking confirmed: ${res.data?.data?.booking?.bookingReference || 'Success'}`);
      setShowBook(false);
      navigate('/payment');
    } catch (err) {
      alert.handleApiError(err, 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-center"><Spinner size="lg" /></div>;
  }

  if (!room) {
    return (
      <div className="empty-state public-section">
        <FaHotel className="empty-icon" />
        <p>Room not found.</p>
        <Link to="/rooms" className="btn btn-primary">Back to Rooms</Link>
      </div>
    );
  }

  const cover = getRoomCover(room);
  const nightsEstimate = form.checkIn && form.checkOut
    ? Math.max(1, Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000))
    : 1;

  return (
    <div className="room-detail-page">
      <section
        className="room-detail-hero room-detail-hero-photo"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(44,74,62,0.35), rgba(31,41,34,0.85)), url(${cover})` }}
      >
        <div className="room-detail-hero-inner">
          <Link to="/rooms" className="btn btn-outline btn-sm hero-outline">
            <FaArrowLeft /> All Rooms
          </Link>
          <div className="room-detail-hero-meta">
            <RoomStatusBadge status={room.status} />
            <span className="room-type-pill">{room.roomType}</span>
          </div>
          <h1>{room.name || `Room ${room.roomNumber}`}</h1>
          <p>Room {room.roomNumber} · Floor {room.floor}</p>
        </div>
      </section>

      <section className="public-section room-detail-grid">
        <div className="room-detail-main">
          <RoomGallery room={room} />

          <div className="room-detail-block">
            <h2>Overview</h2>
            <p>{room.description || 'An elegant LuxuryStay room featuring refined finishes, thoughtful amenities, and a serene atmosphere for rest and focus.'}</p>
          </div>

          <div className="room-detail-block">
            <h2>Specifications</h2>
            <div className="spec-grid">
              <div><FaBed /> <span>Bed</span><strong>{room.bedType || 'King'}</strong></div>
              <div><FaUsers /> <span>Capacity</span><strong>{room.capacity?.adults || 2} adults{room.capacity?.children ? `, ${room.capacity.children} children` : ''}</strong></div>
              <div><FaRulerCombined /> <span>Size</span><strong>{room.size ? `${room.size} m²` : '—'}</strong></div>
              <div><FaEye /> <span>View</span><strong>{room.view || 'Interior'}</strong></div>
            </div>
          </div>

          <div className="room-detail-block">
            <h2>Amenities</h2>
            <div className="amenity-chips">
              {(room.amenities || ['WiFi', 'TV', 'Housekeeping']).map((a) => (
                <span key={a} className="amenity-chip"><FaCheckCircle /> {a}</span>
              ))}
            </div>
          </div>
        </div>

        <aside className="room-booking-panel">
          <div className="price-line">
            <strong>{formatCurrency(room.pricePerNight)}</strong>
            <span>/ night</span>
          </div>

          <div className="avail-form">
            <FormInput label="Check-in" type="date" min={today} value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
            <FormInput label="Check-out" type="date" min={form.checkIn || today} value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
            <Button variant="outline" onClick={checkAvailability} disabled={checking} icon={checking ? <Spinner size="sm" /> : <FaCheckCircle />}>
              {checking ? 'Checking...' : 'Check Availability'}
            </Button>
            {availability !== null && (
              <p className={`avail-msg ${availability ? 'ok' : 'bad'}`}>
                {availability ? 'Available for selected dates' : 'Not available for selected dates'}
              </p>
            )}
          </div>

          <Button variant="primary" size="lg" fullWidth icon={<FaCalendarCheck />} onClick={openBooking}>
            Book Now
          </Button>
          <Link to={`/booking?roomId=${room._id}`} className="btn btn-outline" style={{ width: '100%', marginTop: '0.65rem', justifyContent: 'center' }}>
            Full Booking Flow
          </Link>
          <p className="panel-note">
            {isAuthenticated && isGuest()
              ? 'You will confirm dates and special requests next.'
              : 'Sign in as a guest to complete your reservation.'}
          </p>
        </aside>
      </section>

      <Modal
        isOpen={showBook}
        onClose={() => setShowBook(false)}
        title={`Book ${room.name || room.roomNumber}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBook(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitBooking} disabled={submitting} icon={submitting ? <Spinner size="sm" /> : <FaCalendarCheck />}>
              {submitting ? 'Booking...' : `Confirm · ~${formatCurrency(room.pricePerNight * nightsEstimate)}`}
            </Button>
          </>
        }
      >
        <form className="form-grid-2" onSubmit={submitBooking}>
          <FormInput label="Check-in" type="date" min={today} required value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
          <FormInput label="Check-out" type="date" min={form.checkIn || today} required value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
          <FormSelect
            label="Adults"
            value={form.numAdults}
            onChange={(e) => setForm({ ...form, numAdults: e.target.value })}
            options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))}
          />
          <FormSelect
            label="Children"
            value={form.numChildren}
            onChange={(e) => setForm({ ...form, numChildren: e.target.value })}
            options={[0, 1, 2, 3, 4].map((n) => ({ value: n, label: String(n) }))}
          />
          <div className="form-grid-span-2">
            <FormTextarea
              label="Special Requests"
              rows={3}
              value={form.specialRequests}
              onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
              placeholder="Late check-in, high floor, dietary notes..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RoomDetail;
