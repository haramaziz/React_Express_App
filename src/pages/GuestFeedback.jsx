import { useState, useEffect } from 'react';
import { FaStar, FaPaperPlane } from 'react-icons/fa';
import { Card, Button, FormInput, FormSelect, FormTextarea, Spinner, Badge } from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';

const GuestFeedback = () => {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState({
    rating: 5,
    category: 'overall',
    title: '',
    comment: '',
    booking: '',
    wouldRecommend: true
  });

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await apiService.bookings.getMine();
      const list = res.data?.data?.bookings || [];
      setBookings(list.filter(b => ['checked_out', 'checked_in', 'confirmed'].includes(b.status)));
    } catch (err) {
      alert.handleApiError(err, 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.comment.trim()) {
      alert.error('Please share a few words about your stay');
      return;
    }
    setSubmitting(true);
    try {
      const selected = bookings.find(b => b._id === form.booking);
      await apiService.feedback.create({
        rating: Number(form.rating),
        category: form.category,
        title: form.title || 'Guest review',
        comment: form.comment,
        booking: form.booking || undefined,
        room: selected?.room?._id || selected?.room,
        wouldRecommend: form.wouldRecommend
      });
      alert.success('Thank you! Your feedback was submitted.');
      setForm({ rating: 5, category: 'overall', title: '', comment: '', booking: '', wouldRecommend: true });
    } catch (err) {
      alert.handleApiError(err, 'Failed to submit feedback');
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
    <div className="guest-feedback-page">
      <Card title="Share Your Experience" subtitle="Help us improve LuxuryStay with your honest feedback" icon={<FaStar />}>
        <form onSubmit={handleSubmit} className="form-grid-2">
          <FormSelect
            label="Related Booking"
            value={form.booking}
            onChange={e => setForm({ ...form, booking: e.target.value })}
            options={[
              { value: '', label: 'General feedback' },
              ...bookings.map(b => ({
                value: b._id,
                label: `${b.bookingReference} · Room ${b.room?.roomNumber || '—'} · ${b.status}`
              }))
            ]}
          />
          <FormSelect
            label="Category"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            options={[
              { value: 'overall', label: 'Overall Stay' },
              { value: 'room', label: 'Room Quality' },
              { value: 'service', label: 'Service' },
              { value: 'food', label: 'Food & Dining' },
              { value: 'cleanliness', label: 'Cleanliness' },
              { value: 'staff', label: 'Staff' },
              { value: 'facilities', label: 'Facilities' },
              { value: 'other', label: 'Other' }
            ]}
          />
          <FormSelect
            label="Rating"
            value={form.rating}
            onChange={e => setForm({ ...form, rating: e.target.value })}
            options={[5, 4, 3, 2, 1].map(n => ({ value: n, label: `${n} Star${n > 1 ? 's' : ''}` }))}
          />
          <FormSelect
            label="Would Recommend?"
            value={form.wouldRecommend ? 'yes' : 'no'}
            onChange={e => setForm({ ...form, wouldRecommend: e.target.value === 'yes' })}
            options={[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' }
            ]}
          />
          <div className="form-grid-span-2">
            <FormInput
              label="Title"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="A memorable stay"
            />
          </div>
          <div className="form-grid-span-2">
            <FormTextarea
              label="Your Feedback"
              rows={4}
              value={form.comment}
              onChange={e => setForm({ ...form, comment: e.target.value })}
              placeholder="Tell us what you loved or what we can improve..."
              required
            />
          </div>
          <div className="form-grid-span-2" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Button type="submit" variant="primary" icon={submitting ? <Spinner size="sm" /> : <FaPaperPlane />} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
            <Badge variant="info">Ratings help us improve every stay</Badge>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default GuestFeedback;
