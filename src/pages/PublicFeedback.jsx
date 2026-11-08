import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaPaperPlane, FaComments } from 'react-icons/fa';
import {
  Spinner,
  Button,
  Card,
  FormInput,
  FormSelect,
  FormTextarea,
} from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';
import GuestAvatar from '../components/GuestAvatar';

const PublicFeedback = () => {
  const alert = useAlert();
  const { isAuthenticated, isGuest } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testimonials, setTestimonials] = useState([]);
  const [form, setForm] = useState({
    rating: 5,
    category: 'overall',
    title: '',
    comment: '',
    wouldRecommend: true
  });

  const canSubmit = isAuthenticated && isGuest();

  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    try {
      setLoading(true);
      const res = await apiService.feedback.getPublic();
      setTestimonials(res.data?.data?.feedbacks || []);
    } catch (err) {
      alert.handleApiError(err, 'Failed to load guest reviews');
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      alert.info('Please sign in as a guest to submit feedback');
      return;
    }
    if (!form.comment.trim()) {
      alert.error('Please share a few words about your stay');
      return;
    }
    try {
      setSubmitting(true);
      await apiService.feedback.create({
        rating: Number(form.rating),
        category: form.category,
        title: form.title || 'Guest review',
        comment: form.comment,
        wouldRecommend: form.wouldRecommend
      });
      alert.success('Thank you! Your feedback was submitted.');
      setForm({ rating: 5, category: 'overall', title: '', comment: '', wouldRecommend: true });
      await loadTestimonials();
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
    <div className="public-feedback-page">
      <section className="public-section">
        <div className="section-header">
          <h1 className="section-title">Guest Reviews</h1>
          <p className="section-subtitle">Honest voices from recent LuxuryStay stays</p>
        </div>

        {testimonials.length === 0 ? (
          <p className="muted-center">Guest testimonials will appear here as reviews are published.</p>
        ) : (
          <div className="testimonials-grid">
            {testimonials.map((item) => (
              <article key={item._id} className="testimonial-card">
                <div className="testimonial-header">
                  <GuestAvatar guest={item.guest} anonymous={item.anonymous} />
                  <div>
                    <div className="testimonial-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <FaStar
                          key={i}
                          style={{ opacity: i < (item.rating || 0) ? 1 : 0.25 }}
                        />
                      ))}
                    </div>
                    <h3>{item.title || 'Wonderful stay'}</h3>
                  </div>
                </div>
                <p>{item.comment || 'A memorable LuxuryStay experience.'}</p>
                <footer>
                  {item.anonymous
                    ? 'Guest'
                    : `${item.guest?.firstName || 'Guest'}${item.guest?.lastName?.[0] ? ` ${item.guest.lastName[0]}.` : ''}`}
                  {item.category ? ` · ${item.category}` : ''}
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="public-section" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <h2 className="section-title">Share Your Experience</h2>
          <p className="section-subtitle">
            {canSubmit
              ? 'Your feedback helps us refine every stay'
              : 'Sign in as a guest to leave a review'}
          </p>
        </div>

        {canSubmit ? (
          <Card title="Submit Feedback" icon={<FaComments />}>
            <form onSubmit={handleSubmit} className="form-grid-2">
              <FormSelect
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
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
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
                options={[5, 4, 3, 2, 1].map((n) => ({
                  value: n,
                  label: `${n} Star${n > 1 ? 's' : ''}`
                }))}
              />
              <FormSelect
                label="Would Recommend?"
                value={form.wouldRecommend ? 'yes' : 'no'}
                onChange={(e) => setForm({ ...form, wouldRecommend: e.target.value === 'yes' })}
                options={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' }
                ]}
              />
              <FormInput
                label="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="A memorable stay"
              />
              <div className="form-grid-span-2">
                <FormTextarea
                  label="Your Feedback"
                  rows={4}
                  required
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  placeholder="Tell us what you loved or what we can improve..."
                />
              </div>
              <div className="form-grid-span-2" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  type="submit"
                  variant="primary"
                  icon={submitting ? <Spinner size="sm" /> : <FaPaperPlane />}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Guest ID is resolved automatically
                </span>
              </div>
            </form>
          </Card>
        ) : (
          <Card>
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <FaStar className="empty-icon" />
              <p>Only signed-in guests can submit reviews.</p>
              <Link to="/login?redirect=/feedback" className="btn btn-primary">
                Sign In to Review
              </Link>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
};

export default PublicFeedback;
