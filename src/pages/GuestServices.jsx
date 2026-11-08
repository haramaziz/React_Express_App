import { useState, useEffect } from 'react';
import { FaConciergeBell, FaPlus } from 'react-icons/fa';
import { Card, Button, FormInput, FormSelect, FormTextarea, Spinner, Badge, formatCurrency, formatDate } from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';

const GuestServices = () => {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    serviceType: 'room_service',
    title: '',
    description: '',
    booking: '',
    scheduledAt: '',
    quantity: 1,
    priority: 'normal'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cat, svc, bk] = await Promise.all([
        apiService.services.getCatalog(),
        apiService.services.getAll(),
        apiService.bookings.getMine()
      ]);
      setCatalog(cat.data?.data?.catalog || []);
      setServices(svc.data?.data?.services || []);
      setBookings((bk.data?.data?.bookings || []).filter(b => ['confirmed', 'checked_in'].includes(b.status)));
    } catch (err) {
      alert.handleApiError(err, 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const selectedPrice = catalog.find(c => c.type === form.serviceType)?.unitPrice ?? 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert.error('Please enter a service title');
      return;
    }
    setSubmitting(true);
    try {
      await apiService.services.create({
        ...form,
        quantity: Number(form.quantity) || 1,
        booking: form.booking || undefined,
        scheduledAt: form.scheduledAt || undefined
      });
      alert.success('Service request submitted');
      setShowForm(false);
      setForm({
        serviceType: 'room_service',
        title: '',
        description: '',
        booking: '',
        scheduledAt: '',
        quantity: 1,
        priority: 'normal'
      });
      await loadData();
    } catch (err) {
      alert.handleApiError(err, 'Failed to request service');
    } finally {
      setSubmitting(false);
    }
  };

  const statusVariant = (status) => {
    const map = {
      pending: 'warning',
      confirmed: 'info',
      in_progress: 'primary',
      completed: 'success',
      cancelled: 'danger'
    };
    return map[status] || 'secondary';
  };

  if (loading) {
    return (
      <div className="loading-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="guest-services-page">
      <Card
        title="Additional Services"
        subtitle="Request room service, spa, transport, laundry, and more"
        icon={<FaConciergeBell />}
        actions={
          <Button variant="primary" icon={<FaPlus />} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Close' : 'New Request'}
          </Button>
        }
      >
        {showForm && (
          <form onSubmit={handleSubmit} className="form-grid-2" style={{ marginBottom: '1.5rem' }}>
            <FormSelect
              label="Service Type"
              value={form.serviceType}
              onChange={e => {
                const type = e.target.value;
                const label = catalog.find(c => c.type === type)?.label || type;
                setForm({ ...form, serviceType: type, title: form.title || label });
              }}
              options={catalog.map(c => ({ value: c.type, label: `${c.label} (${formatCurrency(c.unitPrice)})` }))}
            />
            <FormSelect
              label="Related Booking"
              value={form.booking}
              onChange={e => setForm({ ...form, booking: e.target.value })}
              options={[
                { value: '', label: 'Auto-select active stay' },
                ...bookings.map(b => ({
                  value: b._id,
                  label: `${b.bookingReference} · Room ${b.room?.roomNumber || '—'}`
                }))
              ]}
            />
            <FormInput
              label="Title"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Breakfast in room"
              required
            />
            <FormInput
              label="Quantity"
              type="number"
              min="1"
              value={form.quantity}
              onChange={e => setForm({ ...form, quantity: e.target.value })}
            />
            <FormInput
              label="Preferred Time"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
            />
            <FormSelect
              label="Priority"
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' }
              ]}
            />
            <div className="form-grid-span-2">
              <FormTextarea
                label="Details"
                rows={3}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Any special instructions..."
              />
            </div>
            <div className="form-grid-span-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Badge variant="info">Est. total: {formatCurrency(selectedPrice * (Number(form.quantity) || 1))}</Badge>
              <Button type="submit" variant="primary" disabled={submitting} icon={submitting ? <Spinner size="sm" /> : <FaConciergeBell />}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        )}

        {services.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No service requests yet. Tap New Request to get started.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Requested</th>
                </tr>
              </thead>
              <tbody>
                {services.map(s => (
                  <tr key={s._id}>
                    <td>
                      <strong>{s.title}</strong>
                      {s.description && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.description}</div>}
                    </td>
                    <td>{s.serviceType?.replace(/_/g, ' ')}</td>
                    <td><Badge variant={statusVariant(s.status)}>{s.status}</Badge></td>
                    <td>{formatCurrency(s.totalPrice || 0)}</td>
                    <td>{formatDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default GuestServices;
