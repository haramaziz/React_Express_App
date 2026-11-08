import { useState, useEffect } from 'react';
import {
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaClock,
  FaPaperPlane,
  FaHotel
} from 'react-icons/fa';
import {
  Spinner,
  Button,
  Card,
  FormInput,
  FormTextarea
} from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';

const Contact = () => {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await apiService.settings.getPublic();
      setSettings(res.data?.data?.settings || res.data?.settings || res.data?.data || null);
    } catch (err) {
      alert.handleApiError(err, 'Failed to load contact details');
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  const general = settings?.general || settings || {};
  const hotelName = general.hotelName || 'LuxuryStay';
  const phone = general.hotelPhone || '+1 (555) 123-4567';
  const email = general.hotelEmail || 'info@luxurystay.com';
  const address = general.hotelAddress || '123 Luxury Avenue, Beverly Hills, CA 90210';
  const checkInTime = general.checkInTime || '15:00';
  const checkOutTime = general.checkOutTime || '11:00';
  const mapQuery = encodeURIComponent(address);
  const mapSrc = `https://maps.google.com/maps?q=${mapQuery}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      alert.error('Name, email, and message are required');
      return;
    }
    try {
      setSubmitting(true);
      await apiService.contact.send({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        subject: form.subject.trim() || 'Website inquiry',
        message: form.message.trim()
      });
      alert.success('Message sent. Our team will respond shortly.');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      alert.handleApiError(err, 'Failed to send message');
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
    <div className="contact-page">
      <section className="public-section">
        <div className="section-header">
          <h1 className="section-title">Contact {hotelName}</h1>
          <p className="section-subtitle">We are here to help with reservations and guest services</p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}
        >
          <div className="amenity-card">
            <div className="amenity-icon"><FaPhone /></div>
            <h3>Phone</h3>
            <p><a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a></p>
          </div>
          <div className="amenity-card">
            <div className="amenity-icon"><FaEnvelope /></div>
            <h3>Email</h3>
            <p><a href={`mailto:${email}`}>{email}</a></p>
          </div>
          <div className="amenity-card">
            <div className="amenity-icon"><FaMapMarkerAlt /></div>
            <h3>Address</h3>
            <p>{address}</p>
          </div>
          <div className="amenity-card">
            <div className="amenity-icon"><FaClock /></div>
            <h3>Operating Hours</h3>
            <p>
              Check-in from {checkInTime}
              <br />
              Check-out by {checkOutTime}
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            alignItems: 'start'
          }}
        >
          <Card title="Send a Message" subtitle="We typically reply within one business day" icon={<FaPaperPlane />}>
            <form onSubmit={handleSubmit} className="form-grid-2">
              <FormInput
                label="Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name"
              />
              <FormInput
                label="Email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
              <FormInput
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
              <FormInput
                label="Subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Reservation question"
              />
              <div className="form-grid-span-2">
                <FormTextarea
                  label="Message"
                  rows={5}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="How can we assist you?"
                />
              </div>
              <div className="form-grid-span-2">
                <Button
                  type="submit"
                  variant="primary"
                  icon={submitting ? <Spinner size="sm" /> : <FaPaperPlane />}
                  disabled={submitting}
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </form>
          </Card>

          <Card title="Find Us" subtitle={hotelName} icon={<FaHotel />}>
            <div
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid var(--border-light)',
                minHeight: 320
              }}
            >
              <iframe
                title={`${hotelName} location map`}
                src={mapSrc}
                width="100%"
                height="320"
                style={{ border: 0, display: 'block' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <FaMapMarkerAlt style={{ marginTop: 4, color: 'var(--primary)', flexShrink: 0 }} />
              {address}
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Contact;
