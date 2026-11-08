import { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaEye, FaBan, FaCheck, FaCrown } from 'react-icons/fa';
import {
  Card, Button, DataTable, Modal, FormInput, FormSelect, FormTextarea,
  Badge, Spinner, formatDate, StarRating
} from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';

const loyaltyBadge = (tier) => {
  const map = {
    none: <Badge variant="secondary">None</Badge>,
    bronze: <Badge variant="warning"><FaCrown /> Bronze</Badge>,
    silver: <Badge variant="secondary"><FaCrown /> Silver</Badge>,
    gold: <Badge variant="warning"><FaCrown /> Gold</Badge>,
    platinum: <Badge variant="primary"><FaCrown /> Platinum</Badge>
  };
  return map[tier] || map.none;
};

const Guests = () => {
  const alert = useAlert();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', loyaltyTier: '', blacklisted: '' });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewGuest, setViewGuest] = useState(null);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    street: '', city: '', state: '', zipCode: '', country: '',
    dateOfBirth: '', nationality: '', idType: '', idNumber: '',
    roomTypePref: '', floorPref: '', smokingPref: false, bedTypePref: '',
    viewPref: '', specialRequests: '', dietaryRequirements: '',
    loyaltyTier: 'none', loyaltyPoints: 0, notes: ''
  });

  useEffect(() => { loadGuests(); }, [filters]);

  const loadGuests = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.loyaltyTier) params.loyaltyTier = filters.loyaltyTier;
      if (filters.blacklisted) params.blacklisted = filters.blacklisted;
      const res = await apiService.guests.getAll(params);
      setGuests(res.data.data.guests);
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditing(null);
    setForm({
      firstName: '', lastName: '', email: '', phone: '',
      street: '', city: '', state: '', zipCode: '', country: '',
      dateOfBirth: '', nationality: '', idType: '', idNumber: '',
      roomTypePref: '', floorPref: '', smokingPref: false, bedTypePref: '',
      viewPref: '', specialRequests: '', dietaryRequirements: '',
      loyaltyTier: 'none', loyaltyPoints: 0, notes: ''
    });
    setShowModal(true);
  };

  const handleEdit = (g) => {
    setEditing(g._id);
    setForm({
      firstName: g.firstName, lastName: g.lastName, email: g.email || '', phone: g.phone,
      street: g.address?.street || '', city: g.address?.city || '', state: g.address?.state || '',
      zipCode: g.address?.zipCode || '', country: g.address?.country || '',
      dateOfBirth: g.dateOfBirth ? new Date(g.dateOfBirth).toISOString().split('T')[0] : '',
      nationality: g.nationality || '', idType: g.idType || '', idNumber: g.idNumber || '',
      roomTypePref: g.preferences?.roomType || '', floorPref: g.preferences?.floor || '',
      smokingPref: g.preferences?.smoking || false, bedTypePref: g.preferences?.bedType || '',
      viewPref: g.preferences?.view || '', specialRequests: g.preferences?.specialRequests || '',
      dietaryRequirements: g.preferences?.dietaryRequirements || '',
      loyaltyTier: g.loyaltyProgram?.tier || 'none', loyaltyPoints: g.loyaltyProgram?.points || 0,
      notes: g.notes || ''
    });
    setShowModal(true);
  };

  const handleView = async (g) => {
    try {
      const res = await apiService.guests.getById(g._id);
      setViewGuest(res.data.data);
      setShowView(true);
    } catch (e) {
      alert.handleApiError(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        address: {
          street: form.street, city: form.city, state: form.state,
          zipCode: form.zipCode, country: form.country
        },
        dateOfBirth: form.dateOfBirth || undefined,
        nationality: form.nationality,
        idType: form.idType || undefined,
        idNumber: form.idNumber || undefined,
        preferences: {
          roomType: form.roomTypePref || undefined,
          floor: form.floorPref || undefined,
          smoking: form.smokingPref,
          bedType: form.bedTypePref || undefined,
          view: form.viewPref || undefined,
          specialRequests: form.specialRequests || undefined,
          dietaryRequirements: form.dietaryRequirements || undefined
        },
        loyaltyProgram: {
          tier: form.loyaltyTier,
          points: Number(form.loyaltyPoints) || 0
        },
        notes: form.notes
      };

      if (editing) {
        await apiService.guests.update(editing, payload);
        alert.success('Guest updated');
      } else {
        await apiService.guests.create(payload);
        alert.success('Guest added');
      }
      setShowModal(false);
      loadGuests();
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlacklist = async (g) => {
    const bl = !g.blacklisted;
    if (bl) {
      const reason = prompt('Enter blacklist reason:');
      if (reason === null) return;
      try {
        await apiService.guests.blacklist(g._id, reason || 'No reason');
        alert.success(`${g.firstName} ${g.lastName} blacklisted`);
      } catch (e) { alert.handleApiError(e); return; }
    } else {
      try {
        await apiService.guests.unblacklist(g._id);
        alert.success(`${g.firstName} ${g.lastName} removed from blacklist`);
      } catch (e) { alert.handleApiError(e); return; }
    }
    loadGuests();
  };

  const handleDelete = async (g) => {
    if (!window.confirm(`Delete ${g.firstName} ${g.lastName}?`)) return;
    try {
      await apiService.guests.delete(g._id);
      alert.success('Guest deleted');
      loadGuests();
    } catch (e) { alert.handleApiError(e); }
  };

  const columns = [
    {
      key: 'firstName',
      label: 'Guest',
      render: (_, r) => (
        <div className="guest-cell">
          <div className="guest-avatar-sm">{r.firstName[0]}{r.lastName[0]}</div>
          <div>
            <strong>{r.firstName} {r.lastName}</strong>
            <small>{r.phone}</small>
          </div>
        </div>
      )
    },
    { key: 'email', label: 'Email', render: v => v || '-' },
    { key: 'nationality', label: 'Nationality', render: v => v || '-' },
    { key: 'totalStays', label: 'Stays', render: v => <Badge variant="info">{v || 0}</Badge>, width: '80px' },
    {
      key: 'totalSpent',
      label: 'Total Spent',
      render: v => <span style={{ fontWeight: 600, color: '#10b981' }}>${(v || 0).toLocaleString()}</span>
    },
    {
      key: 'loyaltyProgram',
      label: 'Loyalty',
      render: v => loyaltyBadge(v?.tier)
    },
    {
      key: 'blacklisted',
      label: 'Status',
      render: (v) => v ? <Badge variant="danger">Blacklisted</Badge> : <Badge variant="success">Active</Badge>
    }
  ];

  const actions = [
    { label: 'View', icon: <FaEye />, variant: 'default', onClick: handleView },
    { label: 'Edit', icon: <FaEdit />, variant: 'primary', onClick: handleEdit },
    {
      label: 'Blacklist',
      icon: g => g.blacklisted ? <FaCheck /> : <FaBan />,
      variant: g => g.blacklisted ? 'success' : 'warning',
      onClick: handleBlacklist
    },
    { label: 'Delete', icon: <FaTrash />, variant: 'danger', onClick: handleDelete }
  ];

  return (
    <div className="guests-page">
      <Card
        title="Guest Database"
        subtitle="Manage guest profiles, preferences, and loyalty program"
        actions={
          <Button variant="primary" icon={<FaPlus />} onClick={handleAdd}>Add Guest</Button>
        }
      >
        <div className="filter-bar">
          <FormInput
            placeholder="Search name, phone, email, nationality..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
          />
          <FormSelect
            placeholder="All Loyalty Tiers"
            value={filters.loyaltyTier}
            onChange={e => setFilters({ ...filters, loyaltyTier: e.target.value })}
            options={['none', 'bronze', 'silver', 'gold', 'platinum'].map(t => ({ value: t, label: t.toUpperCase() }))}
          />
          <FormSelect
            placeholder="All Status"
            value={filters.blacklisted}
            onChange={e => setFilters({ ...filters, blacklisted: e.target.value })}
            options={[{ value: 'true', label: 'Blacklisted' }, { value: 'false', label: 'Active' }]}
          />
        </div>

        {loading ? <div className="loading-center"><Spinner /></div> : (
          <DataTable columns={columns} data={guests} actions={actions} emptyMessage="No guests found" />
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Guest Profile' : 'Add New Guest'}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : editing ? 'Update Guest' : 'Add Guest'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <h4 style={{ marginBottom: '1rem', color: '#6366f1' }}>Personal Information</h4>
          <div className="form-grid-2">
            <FormInput label="First Name" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required />
            <FormInput label="Last Name" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required />
            <FormInput label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <FormInput label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
            <FormInput label="Date of Birth" type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
            <FormInput label="Nationality" value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} />
            <FormSelect label="ID Type" value={form.idType} onChange={e => setForm({ ...form, idType: e.target.value })} options={['passport', 'driving_license', 'national_id', 'other']} />
            <FormInput label="ID Number" value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} />
          </div>

          <h4 style={{ margin: '1.5rem 0 1rem', color: '#6366f1' }}>Address</h4>
          <div className="form-grid-2">
            <FormInput label="Street" value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} />
            <FormInput label="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            <FormInput label="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
            <FormInput label="ZIP / Postal Code" value={form.zipCode} onChange={e => setForm({ ...form, zipCode: e.target.value })} />
            <div className="form-grid-span-2">
              <FormInput label="Country" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>

          <h4 style={{ margin: '1.5rem 0 1rem', color: '#6366f1' }}>Preferences</h4>
          <div className="form-grid-2">
            <FormSelect label="Room Type Preference" value={form.roomTypePref} onChange={e => setForm({ ...form, roomTypePref: e.target.value })} options={['standard', 'deluxe', 'suite', 'presidential', 'family']} />
            <FormInput label="Preferred Floor" type="number" value={form.floorPref} onChange={e => setForm({ ...form, floorPref: e.target.value })} />
            <FormSelect label="Smoking Preference" value={form.smokingPref} onChange={e => setForm({ ...form, smokingPref: e.target.value === 'true' })} options={[{ value: 'false', label: 'Non-smoking' }, { value: 'true', label: 'Smoking' }]} />
            <FormInput label="Bed Type Preference" value={form.bedTypePref} onChange={e => setForm({ ...form, bedTypePref: e.target.value })} />
            <FormInput label="View Preference" value={form.viewPref} onChange={e => setForm({ ...form, viewPref: e.target.value })} />
            <div className="form-grid-span-2">
              <FormInput label="Dietary Requirements" value={form.dietaryRequirements} onChange={e => setForm({ ...form, dietaryRequirements: e.target.value })} />
            </div>
            <div className="form-grid-span-2">
              <FormTextarea label="Special Requests / Notes" value={form.specialRequests} onChange={e => setForm({ ...form, specialRequests: e.target.value })} />
            </div>
          </div>

          <h4 style={{ margin: '1.5rem 0 1rem', color: '#6366f1' }}>Loyalty Program</h4>
          <div className="form-grid-2">
            <FormSelect label="Tier" value={form.loyaltyTier} onChange={e => setForm({ ...form, loyaltyTier: e.target.value })} options={['none', 'bronze', 'silver', 'gold', 'platinum']} />
            <FormInput label="Points" type="number" value={form.loyaltyPoints} onChange={e => setForm({ ...form, loyaltyPoints: e.target.value })} />
            <div className="form-grid-span-2">
              <FormTextarea label="Admin Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showView}
        onClose={() => setShowView(false)}
        title={`${viewGuest?.guest?.firstName} ${viewGuest?.guest?.lastName} - Profile`}
        size="lg"
      >
        {viewGuest && (
          <div className="guest-details">
            <div className="detail-header">
              <div className="guest-avatar-lg">
                {viewGuest.guest.firstName[0]}{viewGuest.guest.lastName[0]}
              </div>
              <div style={{ flex: 1 }}>
                <h2>{viewGuest.guest.firstName} {viewGuest.guest.lastName}</h2>
                <p style={{ color: '#6b7280' }}>
                  {viewGuest.guest.phone} • {viewGuest.guest.email || 'No email'} • {viewGuest.guest.nationality || ''}
                </p>
                <div style={{ marginTop: '0.5rem' }}>
                  {loyaltyBadge(viewGuest.guest.loyaltyProgram?.tier)}
                  <Badge variant="info" style={{ marginLeft: '8px' }}>{viewGuest.guest.loyaltyProgram?.points || 0} pts</Badge>
                  {viewGuest.guest.blacklisted && <Badge variant="danger" style={{ marginLeft: '8px' }}>Blacklisted</Badge>}
                </div>
              </div>
            </div>

            <div className="summary-cards">
              <div className="sum-card"><span className="sc-label">Total Stays</span><span className="sc-value">{viewGuest.guest.totalStays || 0}</span></div>
              <div className="sum-card"><span className="sc-label">Total Spent</span><span className="sc-value">${(viewGuest.guest.totalSpent || 0).toLocaleString()}</span></div>
              <div className="sum-card"><span className="sc-label">History</span><span className="sc-value">{viewGuest.stays?.history?.length || 0}</span></div>
              <div className="sum-card"><span className="sc-label">Upcoming</span><span className="sc-value">{viewGuest.stays?.upcoming?.length || 0}</span></div>
            </div>

            {viewGuest.stays?.upcoming?.length > 0 && (
              <div className="detail-section">
                <h4>Upcoming Stays</h4>
                {viewGuest.stays.upcoming.map(s => (
                  <div key={s._id} className="stay-item">
                    <div><strong>Room {s.room?.roomNumber}</strong> <Badge variant="info">{s.room?.roomType}</Badge></div>
                    <small>{formatDate(s.checkIn)} → {formatDate(s.checkOut)}</small>
                  </div>
                ))}
              </div>
            )}

            {viewGuest.stays?.history?.length > 0 && (
              <div className="detail-section">
                <h4>Stay History</h4>
                {viewGuest.stays.history.slice(0, 5).map(s => (
                  <div key={s._id} className="stay-item">
                    <div><strong>Room {s.room?.roomNumber}</strong> <Badge variant="success">Completed</Badge></div>
                    <small>{formatDate(s.checkIn)} → {formatDate(s.checkOut)}</small>
                  </div>
                ))}
              </div>
            )}

            {viewGuest.guest.notes && (
              <div className="detail-section">
                <h4>Notes</h4>
                <p>{viewGuest.guest.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Guests;
