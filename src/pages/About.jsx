import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaHotel,
  FaHandsHelping,
  FaCouch,
  FaLeaf,
  FaAward,
  FaMapMarkerAlt,
  FaArrowRight,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { Spinner, Card } from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';

const HOTEL_HERO =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80';

const TOUR_SLIDES = [
  {
    title: 'Lobby Lounge',
    caption: 'A calm arrival space with forest-toned finishes and soft natural light.',
    image: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1400&q=80'
  },
  {
    title: 'Infinity Pool',
    caption: 'Resort waters overlooking gardens—quiet mornings and golden evenings.',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=80'
  },
  {
    title: 'Suite View',
    caption: 'Layered textiles, private seating, and framed vistas for restorative stays.',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1400&q=80'
  },
  {
    title: 'Fine Dining',
    caption: 'Seasonal plates in a serene dining room designed for lingering evenings.',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80'
  }
];

const VALUES = [
  {
    icon: <FaHandsHelping />,
    title: 'Service',
    text: 'Attentive hospitality at every touchpoint—from arrival to farewell.'
  },
  {
    icon: <FaCouch />,
    title: 'Comfort',
    text: 'Thoughtfully designed spaces and premium amenities for restorative stays.'
  },
  {
    icon: <FaLeaf />,
    title: 'Sustainability',
    text: 'Responsible practices that protect the environments our guests enjoy.'
  },
  {
    icon: <FaAward />,
    title: 'Excellence',
    text: 'A commitment to refined standards in rooms, dining, and guest care.'
  }
];

const About = () => {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await apiService.settings.getPublic();
      setSettings(res.data?.data?.settings || res.data?.settings || res.data?.data || null);
    } catch (err) {
      alert.handleApiError(err, 'Failed to load hotel information');
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  const goTo = useCallback((index) => {
    setSlide((index + TOUR_SLIDES.length) % TOUR_SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return undefined;
    timerRef.current = setInterval(() => {
      setSlide((s) => (s + 1) % TOUR_SLIDES.length);
    }, 4500);
    return () => clearInterval(timerRef.current);
  }, [paused]);

  const general = settings?.general || settings || {};
  const hotelName = general.hotelName || 'LuxuryStay';
  const hotelAddress = general.hotelAddress || '123 Luxury Avenue, Beverly Hills, CA';

  if (loading) {
    return (
      <div className="loading-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const active = TOUR_SLIDES[slide];

  return (
    <div className="about-page">
      <section
        className="about-hero"
        style={{ backgroundImage: `linear-gradient(120deg, rgba(44,74,62,0.72), rgba(31,41,34,0.55)), url(${HOTEL_HERO})` }}
      >
        <div className="about-hero-inner">
          <p className="about-hero-kicker">LuxuryStay Hospitality</p>
          <h1>About {hotelName}</h1>
          <p>A refined eco-hospitality brand dedicated to calm, elevated stays.</p>
          {hotelAddress && (
            <p className="about-hero-address">
              <FaMapMarkerAlt /> {hotelAddress}
            </p>
          )}
        </div>
      </section>

      <section className="public-section">
        <Card icon={<FaHotel />} title="Our Story" subtitle="Hospitality with intention">
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
            {hotelName} was founded on a simple belief: travel should feel restorative.
            From carefully curated rooms to attentive concierge care, we craft each stay
            around quiet luxury—where comfort, design, and service meet without noise.
            Whether you arrive for a city escape or a longer retreat, our team is here to
            make every detail effortless.
          </p>
        </Card>
      </section>

      <section className="public-section" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <h2 className="section-title">Our Values</h2>
          <p className="section-subtitle">The principles that guide every guest experience</p>
        </div>
        <div className="features-grid">
          {VALUES.map((item) => (
            <div key={item.title} className="amenity-card">
              <div className="amenity-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <h2 className="section-title">Virtual Tour Preview</h2>
          <p className="section-subtitle">
            Step inside our lobby, suites, and wellness spaces before you arrive
          </p>
        </div>

        <div
          className="tour-slider"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="tour-slider-stage">
            {TOUR_SLIDES.map((item, i) => (
              <div
                key={item.title}
                className={`tour-slide ${i === slide ? 'active' : ''}`}
                style={{ backgroundImage: `url(${item.image})` }}
                aria-hidden={i !== slide}
              />
            ))}
            <div className="tour-slide-overlay">
              <h3>{active.title}</h3>
              <p>{active.caption}</p>
            </div>
            <button
              type="button"
              className="tour-nav prev"
              onClick={() => goTo(slide - 1)}
              aria-label="Previous slide"
            >
              <FaChevronLeft />
            </button>
            <button
              type="button"
              className="tour-nav next"
              onClick={() => goTo(slide + 1)}
              aria-label="Next slide"
            >
              <FaChevronRight />
            </button>
          </div>

          <div className="tour-dots" role="tablist" aria-label="Tour slides">
            {TOUR_SLIDES.map((item, i) => (
              <button
                key={item.title}
                type="button"
                role="tab"
                aria-selected={i === slide}
                className={`tour-dot ${i === slide ? 'active' : ''}`}
                onClick={() => goTo(i)}
              >
                <span className="sr-only">{item.title}</span>
              </button>
            ))}
          </div>

          <div className="section-actions" style={{ marginTop: '1.25rem' }}>
            <Link to="/rooms" className="btn btn-primary">
              Browse Rooms <FaArrowRight />
            </Link>
            <Link to="/booking" className="btn btn-outline">
              Book a Stay
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
