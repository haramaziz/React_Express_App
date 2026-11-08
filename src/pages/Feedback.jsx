import { useState, useEffect } from 'react';
import { FaEye, FaReply, FaStar, FaTrash, FaThumbsUp } from 'react-icons/fa';
import {
  Card, Button, DataTable, Modal, FormSelect, FormTextarea,
  Badge, Spinner, formatDate, StarRating
} from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';

const Feedback = () => {
  const alert = useAlert();
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ rating: '', category: '' });
  const [showView, setShowView] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [active, setActive] = useState(null);
  const [replyForm, setReplyForm] = useState({ response: '', actionTaken: '', featured: false });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.rating) params.rating = filters.rating;
      if (filters.category) params.category = filters.category;
      const [fRes, sRes] = await Promise.all([
        apiService.feedback.getAll(params),
        apiService.feedback.getSummary()
      ]);
      setFeedbacks(fRes.data.data.feedbacks);
      setStats(fRes.data.stats || {});
      setSummary(sRes.data.data);
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (f) => {
    try {
      const res = await apiService.feedback.getById(f._id);
      setActive(res.data.data.feedback);
      setShowView(true);
    } catch (e) {
      alert.handleApiError(e);
    }
  };

  const openReply = async (f) => {
    setActive(f);
    setReplyForm({ response: f.response || '', actionTaken: f.actionTaken || '', featured: f.featured || false });
    setShowReply(true);
  };

  const submitReply = async () => {
    try {
      setSubmitting(true);
      await apiService.feedback.respond(active._id, replyForm);
      alert.success('Response saved');
      setShowReply(false);
      loadData();
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFeature = async (f) => {
    try {
      await apiService.feedback.toggleFeature(f._id, !f.featured);
      alert.success(f.featured ? 'Unfeatured' : 'Featured');
      loadData();
    } catch (e) {
      alert.handleApiError(e);
    }
  };

  const handleDelete = async (f) => {
    if (!window.confirm('Delete this feedback?')) return;
    try {
      await apiService.feedback.delete(f._id);
      alert.success('Feedback deleted');
      loadData();
    } catch (e) {
      alert.handleApiError(e);
    }
  };

  const columns = [
    {
      key: 'guest',
      label: 'Guest',
      render: v => v ? (
        <div>
          <strong>{v.firstName} {v.lastName}</strong>
        </div>
      ) : <span>Anonymous</span>
    },
    {
      key: 'rating',
      label: 'Rating',
      render: v => <StarRating rating={v} />
    },
    {
      key: 'title',
      label: 'Feedback',
      render: (_, r) => (
        <div>
          {r.title && <div style={{ fontWeight: 600 }}>{r.title}</div>}
          <small style={{ color: '#6b7280' }}>{(r.comment || '').substring(0, 60)}...</small>
        </div>
      )
    },
    { key: 'category', label: 'Category', render: v => <Badge variant="info">{v || 'overall'}</Badge> },
    {
      key: 'wouldRecommend',
      label: 'Recommend',
      render: v => v ? <Badge variant="success"><FaThumbsUp /> Yes</Badge> : <Badge variant="secondary">No</Badge>
    },
    {
      key: 'responded',
      label: 'Status',
      render: (_, r) => (
        <>
          {r.featured && <Badge variant="warning" style={{ marginRight: '4px' }}>Featured</Badge>}
          {r.responded ? <Badge variant="success">Responded</Badge> : <Badge variant="warning">Pending</Badge>}
        </>
      )
    },
    { key: 'createdAt', label: 'Date', render: v => formatDate(v) }
  ];

  const actions = [
    { label: 'View', icon: <FaEye />, variant: 'default', onClick: handleView },
    { label: 'Respond', icon: <FaReply />, variant: 'primary', onClick: openReply, disabled: r => r.responded },
    { label: 'Feature', icon: <FaStar />, variant: 'warning', onClick: toggleFeature }
  ];

  const ratingsDist = [5, 4, 3, 2, 1].map(star => {
    const count = stats.byRating?.find(r => r._id === star)?.count || 0;
    const total = stats.byRating?.reduce((s, r) => s + r.count, 0) || 1;
    return { star, count, pct: Math.round((count / total) * 100) };
  });

  return (
    <div className="feedback-page">
      <div className="fin-stats">
        <Card className="fin-card">
          <div className="fin-card-inner">
            <span className="fin-label">Avg Rating</span>
            <span className="fin-value warning" style={{ fontSize: '2rem' }}>
              {summary?.averageRating || 0}
              <StarRating rating={Math.round(summary?.averageRating || 0)} size="sm" />
            </span>
          </div>
        </Card>
        <Card className="fin-card">
          <div className="fin-card-inner">
            <span className="fin-label">Total Reviews</span>
            <span className="fin-value primary">{summary?.total || 0}</span>
          </div>
        </Card>
        <Card className="fin-card">
          <div className="fin-card-inner">
            <span className="fin-label">Would Recommend</span>
            <span className="fin-value success">
              {summary?.recommendation?.find(r => r._id === true)?.count || 0}
            </span>
          </div>
        </Card>
        <Card className="fin-card">
          <div className="fin-card-inner">
            <span className="fin-label">Pending Response</span>
            <span className="fin-value danger">{(summary?.total || 0) - (feedbacks.filter(f => f.responded).length || 0)}</span>
          </div>
        </Card>
      </div>

      <div className="feedback-grid">
        <Card title="Rating Breakdown">
          <div className="ratings-breakdown">
            {ratingsDist.map(r => (
              <div key={r.star} className="rating-row">
                <span className="rating-stars">
                  <StarRating rating={r.star} />
                </span>
                <div className="rating-bar-wrap">
                  <div className="rating-bar" style={{ width: `${r.pct}%` }}></div>
                </div>
                <span className="rating-count">{r.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="All Feedback"
          actions={<Button variant="outline" onClick={() => { setFilters({ rating: '', category: '' }); }}>Reset Filters</Button>}
        >
          <div className="filter-bar">
            <FormSelect
              placeholder="All Ratings"
              value={filters.rating}
              onChange={e => setFilters({ ...filters, rating: e.target.value })}
              options={[5, 4, 3, 2, 1].map(r => ({ value: r.toString(), label: `${r} Stars` }))}
            />
            <FormSelect
              placeholder="All Categories"
              value={filters.category}
              onChange={e => setFilters({ ...filters, category: e.target.value })}
              options={['overall', 'room', 'service', 'food', 'cleanliness', 'staff', 'facilities']}
            />
          </div>

          {loading ? <div className="loading-center"><Spinner /></div> : (
            <DataTable columns={columns} data={feedbacks} actions={actions} emptyMessage="No feedback yet" />
          )}
        </Card>
      </div>

      <Modal
        isOpen={showView}
        onClose={() => setShowView(false)}
        title="Feedback Details"
        size="lg"
      >
        {active && (
          <div className="feedback-details">
            <div className="detail-header">
              <div style={{ flex: 1 }}>
                <h2>{active.title || 'Feedback'}</h2>
                <p style={{ color: '#6b7280', marginTop: '4px' }}>
                  From: {active.anonymous ? 'Anonymous Guest' : `${active.guest?.firstName || ''} ${active.guest?.lastName || ''}`}
                  {' • '}{formatDate(active.createdAt, 'full')}
                </p>
                <div style={{ marginTop: '0.5rem' }}>
                  <StarRating rating={active.rating} size="lg" />
                  <Badge variant="info" style={{ marginLeft: '12px' }}>{active.category}</Badge>
                  {active.wouldRecommend && <Badge variant="success" style={{ marginLeft: '8px' }}><FaThumbsUp /> Would Recommend</Badge>}
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>Comment</h4>
              <p style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', lineHeight: 1.7 }}>
                {active.comment || 'No additional comments'}
              </p>
            </div>

            {active.specificFeedback && Object.keys(active.specificFeedback).length > 0 && (
              <div className="detail-section">
                <h4>Specific Ratings</h4>
                <div className="specific-ratings">
                  {Object.entries(active.specificFeedback).map(([key, val]) => (
                    <div key={key} className="spec-rating-row">
                      <span style={{ textTransform: 'capitalize', width: '120px' }}>{key}</span>
                      <StarRating rating={val} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {active.response && (
              <div className="detail-section">
                <h4>Our Response <Badge variant="success" style={{ marginLeft: '8px' }}>Responded</Badge></h4>
                <div style={{ background: '#f0fdf4', padding: '1.5rem', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                  <p style={{ marginBottom: '0.5rem' }}><strong>Response by:</strong> {active.respondedBy?.name}</p>
                  <p>{active.response}</p>
                  {active.actionTaken && (
                    <p style={{ marginTop: '1rem' }}><strong>Action Taken:</strong> {active.actionTaken}</p>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              {!active.responded && (
                <Button variant="primary" icon={<FaReply />} onClick={() => { setShowView(false); openReply(active); }}>
                  Respond to Feedback
                </Button>
              )}
              <Button variant="warning" icon={<FaStar />} onClick={() => toggleFeature(active)}>
                {active.featured ? 'Unfeature' : 'Feature'}
              </Button>
              <Button variant="danger" icon={<FaTrash />} onClick={() => handleDelete(active)}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showReply}
        onClose={() => setShowReply(false)}
        title="Respond to Feedback"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowReply(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitReply} disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Submit Response'}
            </Button>
          </>
        }
      >
        {active && (
          <div>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <StarRating rating={active.rating} /> <strong style={{ marginLeft: '1rem' }}>{active.title}</strong>
              <p style={{ marginTop: '0.5rem', color: '#4b5563' }}>{active.comment?.substring(0, 200)}</p>
            </div>
            <FormTextarea
              label="Your Response *"
              rows={5}
              value={replyForm.response}
              onChange={e => setReplyForm({ ...replyForm, response: e.target.value })}
              placeholder="Write a professional, friendly response to the guest..."
              required
            />
            <FormTextarea
              label="Action Taken (optional)"
              rows={3}
              value={replyForm.actionTaken}
              onChange={e => setReplyForm({ ...replyForm, actionTaken: e.target.value })}
              placeholder="Any corrective actions taken..."
            />
            <FormSelect
              label="Feature this feedback?"
              value={replyForm.featured.toString()}
              onChange={e => setReplyForm({ ...replyForm, featured: e.target.value === 'true' })}
              options={[
                { value: 'false', label: 'No' },
                { value: 'true', label: 'Yes - Feature on testimonials' }
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Feedback;
