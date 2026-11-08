import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBed,
  FaConciergeBell,
  FaUtensils,
  FaSpa,
  FaHotel,
  FaCalendarCheck,
  FaSearch,
  FaStar,
  FaUsers,
  FaArrowRight
} from 'react-icons/fa';
import { formatCurrency, Spinner, RoomStatusBadge } from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { RoomCoverImage } from '../components/RoomMedia';
import GuestAvatar from '../components/GuestAvatar';

const PublicHome = () => {
  const alert = useAlert();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({
    checkIn: '',
    checkOut: '',
    roomType: '',
    guests: '2'
  });

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const [roomsRes, statsRes, feedbackRes] = await Promise.all([
        apiService.rooms.getPublic().catch(() => null),
        apiService.rooms.getPublicStats().catch(() => null),
        apiService.feedback.getPublic().catch(() => null)
      ]);

      const allRooms = roomsRes?.data?.data?.rooms || [];
      setRooms(allRooms.filter((r) => r.status === 'available').slice(0, 6));
      if (allRooms.filter((r) => r.status === 'available').length < 3) {
        setRooms(allRooms.slice(0, 6));
      }
      setStats(statsRes?.data?.data?.stats || null);
      setTestimonials(feedbackRes?.data?.data?.feedbacks || []);
    } catch (err) {
      alert.handleApiError(err, 'Failed to load homepage content');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.checkIn) params.set('checkIn', search.checkIn);
    if (search.checkOut) params.set('checkOut', search.checkOut);
    if (search.roomType) params.set('roomType', search.roomType);
    if (search.guests) params.set('guests', search.guests);
    navigate(`/rooms?${params.toString()}`);
  };

  const amenities = [
    { icon: <FaBed />, title: 'Luxurious Rooms', text: 'Thoughtfully designed suites with premium bedding and city or garden views.' },
    { icon: <FaConciergeBell />, title: 'Concierge Care', text: 'Round-the-clock assistance for reservations, transfers, and special requests.' },
    { icon: <FaUtensils />, title: 'Fine Dining', text: 'Seasonal menus and in-room dining crafted by our hospitality culinary team.' },
    { icon: <FaSpa />, title: 'Wellness & Spa', text: 'Restore balance with spa rituals, fitness access, and quiet lounge spaces.' }
  ];

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="public-home">
      <section className="public-hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-kicker">LuxuryStay Hospitality</p>
          <h1 className="hero-heading">LuxuryStay</h1>
          <p className="hero-subtitle">Refined stays, seamless booking, and attentive service across our hotel collection.</p>
          <div className="hero-cta">
            <Link to="/rooms" className="btn btn-primary btn-lg">
              <FaBed /> Explore Rooms
            </Link>
            <Link to="/booking" className="btn btn-outline btn-lg hero-outline">
              <FaCalendarCheck /> Book Your Stay
            </Link>
          </div>
        </div>
      </section>

      <section className="public-section search-section">
        <form className="availability-widget" onSubmit={handleSearch}>
          <div className="availability-grid">
            <label>
              <span>Check-in</span>
              <input type="date" min={today} value={search.checkIn} onChange={(e) => setSearch({ ...search, checkIn: e.target.value })} />
            </label>
            <label>
              <span>Check-out</span>
              <input type="date" min={search.checkIn || today} value={search.checkOut} onChange={(e) => setSearch({ ...search, checkOut: e.target.value })} />
            </label>
            <label>
              <span>Room Type</span>
              <select value={search.roomType} onChange={(e) => setSearch({ ...search, roomType: e.target.value })}>
                <option value="">Any type</option>
                <option value="standard">Standard</option>
                <option value="deluxe">Deluxe</option>
                <option value="suite">Suite</option>
                <option value="family">Family</option>
                <option value="presidential">Presidential</option>
              </select>
            </label>
            <label>
              <span>Guests</span>
              <select value={search.guests} onChange={(e) => setSearch({ ...search, guests: e.target.value })}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n} Guest{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-primary">
              <FaSearch /> Search Availability
            </button>
          </div>
        </form>
      </section>

      <section className="public-section">
        <div className="section-header">
          <h2 className="section-title">Signature Amenities</h2>
          <p className="section-subtitle">Everything curated for a calm, elevated stay</p>
        </div>
        <div className="features-grid">
          {amenities.map((item) => (
            <div key={item.title} className="amenity-card">
              <div className="amenity-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="public-section">
        <div className="section-header">
          <h2 className="section-title">Featured Rooms</h2>
          <p className="section-subtitle">
            {stats ? `${stats.available || 0} rooms available now` : 'Live inventory from our hotel management system'}
          </p>
        </div>

        {loading ? (
          <div className="loading-center"><Spinner size="lg" /></div>
        ) : rooms.length === 0 ? (
          <div className="empty-state">
            <FaHotel className="empty-icon" />
            <p>No rooms are listed yet. Please check back soon.</p>
          </div>
        ) : (
          <>
            <div className="room-grid">
              {rooms.map((room) => (
                <Link key={room._id} to={`/rooms/${room._id}`} className={`room-card status-${room.status} room-card-link`}>
                  <RoomCoverImage room={room} />
                  <div className="room-card-header">
                    <div>
                      <div className="room-number">{room.roomNumber}</div>
                      <div className="room-type-label">{room.name || room.roomType}</div>
                    </div>
                    <RoomStatusBadge status={room.status} />
                  </div>
                  <div className="room-card-body">
                    <p className="room-desc">{room.description || 'A refined LuxuryStay accommodation with premium amenities.'}</p>
                    <div className="room-meta-row">
                      <span><FaUsers /> {room.capacity?.adults || 2} adults</span>
                      <strong>{formatCurrency(room.pricePerNight)}<small>/night</small></strong>
                    </div>
                    <span className="room-cta-text">View details <FaArrowRight /></span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="section-actions">
              <Link to="/rooms" className="btn btn-outline">View All Rooms</Link>
            </div>
          </>
        )}
      </section>

      <section className="public-section testimonials-section">
        <div className="section-header">
          <h2 className="section-title">Guest Voices</h2>
          <p className="section-subtitle">Recent stays shared by LuxuryStay guests</p>
        </div>
        {testimonials.length === 0 ? (
          <p className="muted-center">Guest testimonials will appear here as reviews are submitted.</p>
        ) : (
          <div className="testimonials-grid">
            {testimonials.slice(0, 4).map((item) => (
              <article key={item._id} className="testimonial-card">
                <div className="testimonial-header">
                  <GuestAvatar guest={item.guest} anonymous={item.anonymous} />
                  <div>
                    <div className="testimonial-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <FaStar key={i} style={{ opacity: i < (item.rating || 0) ? 1 : 0.25 }} />
                      ))}
                    </div>
                    <h3>{item.title || 'Wonderful stay'}</h3>
                  </div>
                </div>
                <p>{item.comment || 'A memorable LuxuryStay experience.'}</p>
                <footer>
                  {item.anonymous
                    ? 'Guest'
                    : `${item.guest?.firstName || 'Guest'} ${item.guest?.lastName?.[0] ? `${item.guest.lastName[0]}.` : ''}`}
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default PublicHome;
