import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  FaBed,
  FaUsers,
  FaCalendarCheck,
  FaCheck,
  FaArrowRight,
  FaArrowLeft,
  FaHotel
} from 'react-icons/fa';
import {
  Spinner,
  Button,
  Card,
  FormInput,
  FormSelect,
  FormTextarea,
  formatCurrency,
  formatDate,
  Badge
} from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';
import { getRoomCover } from '../utils/media';

const STEPS = [
  { id: 1, label: 'Select Room' },
  { id: 2, label: 'Dates & Guests' },
  { id: 3, label: 'Confirm' }
];

const BookingPage = () => {
  const alert = useAlert();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isGuest } = useAuth();

  const [step, setStep] = useState(1);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(searchParams.get('roomId') || '');
  const [form, setForm] = useState({
    checkIn: '',
    checkOut: '',
    numAdults: 1,
    numChildren: 0,
    specialRequests: ''
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const res = await apiService.rooms.getPublic();
      const list = res.data?.data?.rooms || [];
      setRooms(list);
      const preselect = searchParams.get('roomId');
      if (preselect && list.some((r) => r._id === preselect)) {
        setSelectedRoomId(preselect);
      }
    } catch (err) {
      alert.handleApiError(err, 'Failed to load rooms');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedRoom = useMemo(
    () => rooms.find((r) => r._id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;
    const diff = Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000);
    return Math.max(0, diff);
  }, [form.checkIn, form.checkOut]);

  const estimate = selectedRoom && nights > 0
    ? selectedRoom.pricePerNight * nights
    : 0;

  const goNext = () => {
    if (step === 1) {
      if (!selectedRoomId) {
        alert.error('Please select a room to continue');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!form.checkIn || !form.checkOut) {
        alert.error('Please select check-in and check-out dates');
        return;
      }
      if (new Date(form.checkOut) <= new Date(form.checkIn)) {
        alert.error('Check-out must be after check-in');
        return;
      }
      if (nights < 1) {
        alert.error('Stay must be at least one night');
        return;
      }
      setStep(3);
    }
  };

  const goBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const confirmBooking = async () => {
    if (!isAuthenticated || !isGuest()) {
      navigate('/login?redirect=/booking');
      return;
    }
    try {
      setSubmitting(true);
      const res = await apiService.bookings.createGuest({
        room: selectedRoomId,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        numAdults: Number(form.numAdults) || 1,
        numChildren: Number(form.numChildren) || 0,
        specialRequests: form.specialRequests
      });
      const ref = res.data?.data?.booking?.bookingReference;
      alert.success(ref ? `Booking confirmed: ${ref}` : 'Booking confirmed');
      navigate('/payment');
    } catch (err) {
      alert.handleApiError(err, 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="booking-page public-section">
      <div className="section-header">
        <h1 className="section-title">Book Your Stay</h1>
        <p className="section-subtitle">Reserve a room in three simple steps</p>
      </div>

      <div
        className="booking-steps"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginBottom: '2rem'
        }}
      >
        {STEPS.map((s) => (
          <div
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1rem',
              borderRadius: 999,
              border: `1px solid ${step >= s.id ? 'var(--primary)' : 'var(--border-light)'}`,
              background: step === s.id ? 'var(--primary-light)' : 'white',
              color: step >= s.id ? 'var(--primary-dark)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: step > s.id ? 'var(--success)' : step === s.id ? 'var(--primary)' : 'var(--border-light)',
                color: step >= s.id ? 'white' : 'var(--text-secondary)',
                fontSize: '0.75rem'
              }}
            >
              {step > s.id ? <FaCheck /> : s.id}
            </span>
            {s.label}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card title="Choose a Room" subtitle="Select from live inventory" icon={<FaBed />}>
          {rooms.length === 0 ? (
            <div className="empty-state">
              <FaHotel className="empty-icon" />
              <p>No rooms are available right now.</p>
              <Link to="/rooms" className="btn btn-outline">Browse Rooms</Link>
            </div>
          ) : (
            <div className="room-grid">
              {rooms.map((room) => {
                const active = selectedRoomId === room._id;
                const cover = getRoomCover(room);
                return (
                  <button
                    key={room._id}
                    type="button"
                    onClick={() => setSelectedRoomId(room._id)}
                    className={`room-card room-card-link ${active ? 'selected' : ''}`}
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      border: active ? '2px solid var(--primary)' : undefined,
                      outline: 'none',
                      width: '100%'
                    }}
                  >
                    <div
                      className={`room-media tone-${room.roomType || 'standard'}`}
                      style={{
                        backgroundImage: `url(${cover})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      <span className="room-media-label">{room.roomType}</span>
                      {active && (
                        <span style={{ position: 'absolute', top: 8, right: 8 }}>
                          <Badge variant="success"><FaCheck /> Selected</Badge>
                        </span>
                      )}
                    </div>
                    <div className="room-card-header">
                      <div>
                        <div className="room-number">{room.roomNumber}</div>
                        <div className="room-type-label">{room.name || room.roomType}</div>
                      </div>
                    </div>
                    <div className="room-card-body">
                      <p className="room-desc">
                        {room.description || 'A refined LuxuryStay accommodation with premium amenities.'}
                      </p>
                      <div className="room-meta-row">
                        <span><FaUsers /> {room.capacity?.adults || 2} adults</span>
                        <strong>{formatCurrency(room.pricePerNight)}<small>/night</small></strong>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <Button variant="primary" icon={<FaArrowRight />} onClick={goNext} disabled={!selectedRoomId}>
              Continue
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card
          title="Stay Details"
          subtitle={selectedRoom ? `${selectedRoom.name || selectedRoom.roomType} · Room ${selectedRoom.roomNumber}` : ''}
          icon={<FaCalendarCheck />}
        >
          <div className="form-grid-2">
            <FormInput
              label="Check-in"
              type="date"
              min={today}
              required
              value={form.checkIn}
              onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
            />
            <FormInput
              label="Check-out"
              type="date"
              min={form.checkIn || today}
              required
              value={form.checkOut}
              onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
            />
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
          </div>
          {nights > 0 && selectedRoom && (
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
              {nights} night{nights !== 1 ? 's' : ''} · Estimated {formatCurrency(estimate)}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <Button variant="outline" icon={<FaArrowLeft />} onClick={goBack}>Back</Button>
            <Button variant="primary" icon={<FaArrowRight />} onClick={goNext}>Review Booking</Button>
          </div>
        </Card>
      )}

      {step === 3 && selectedRoom && (
        <Card title="Confirm Reservation" subtitle="Review your stay before confirming" icon={<FaCheck />}>
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <img
                src={getRoomCover(selectedRoom)}
                alt={selectedRoom.name || selectedRoom.roomNumber}
                style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 12 }}
              />
              <div>
                <h3 style={{ margin: '0 0 0.35rem', color: 'var(--primary-dark)' }}>
                  {selectedRoom.name || `Room ${selectedRoom.roomNumber}`}
                </h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Room {selectedRoom.roomNumber} · {selectedRoom.roomType}
                </p>
                <p style={{ margin: '0.35rem 0 0' }}>
                  <strong>{formatCurrency(selectedRoom.pricePerNight)}</strong>
                  <span style={{ color: 'var(--text-secondary)' }}> / night</span>
                </p>
              </div>
            </div>

            <div className="form-grid-2" style={{ gap: '0.75rem' }}>
              <div><span style={{ color: 'var(--text-secondary)' }}>Check-in</span><br /><strong>{formatDate(form.checkIn, 'full')}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Check-out</span><br /><strong>{formatDate(form.checkOut, 'full')}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Guests</span><br /><strong>{form.numAdults} adult{Number(form.numAdults) !== 1 ? 's' : ''}{Number(form.numChildren) > 0 ? `, ${form.numChildren} child${Number(form.numChildren) !== 1 ? 'ren' : ''}` : ''}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Nights</span><br /><strong>{nights}</strong></div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Estimated total</span>
                <strong style={{ fontSize: '1.15rem', color: 'var(--primary-dark)' }}>{formatCurrency(estimate)}</strong>
              </div>
              {form.specialRequests && (
                <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  <strong>Requests:</strong> {form.specialRequests}
                </p>
              )}
            </div>

            {!isAuthenticated || !isGuest() ? (
              <p style={{ color: 'var(--warning, #b45309)', margin: 0 }}>
                You must sign in as a guest to confirm. You will be redirected to login.
              </p>
            ) : null}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <Button variant="outline" icon={<FaArrowLeft />} onClick={goBack}>Back</Button>
            <Button
              variant="primary"
              icon={submitting ? <Spinner size="sm" /> : <FaCalendarCheck />}
              disabled={submitting}
              onClick={confirmBooking}
            >
              {submitting ? 'Confirming...' : 'Confirm & Continue to Payment'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BookingPage;
