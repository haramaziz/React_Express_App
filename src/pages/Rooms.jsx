import { useState, useEffect } from 'react';
import { FaPlus, FaFilter, FaBed, FaEdit, FaTrash, FaEye, FaPlay, FaCheck } from 'react-icons/fa';
import {
  Card, Button, DataTable, Modal, FormInput, FormSelect, FormTextarea,
  Badge, Spinner, RoomStatusBadge, CleaningProgressBadge, formatCurrency, formatDate
} from '../components/common';
import * as apiService from '../services/api';
import { useAlert as useAlertCtx } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';

const Rooms = () => {
  const alert = useAlertCtx();
  const { hasRole } = useAuth();
  const isHousekeepingOnly = hasRole('housekeeping');
  const canManageRooms = hasRole('admin', 'manager');

  const [rooms, setRooms] = useState([]);
  const [cleaningBoard, setCleaningBoard] = useState({ pending: [], inProgress: [], stats: {} });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: isHousekeepingOnly ? 'cleaning' : '',
    roomType: '',
    floor: '',
    search: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewRoom, setViewRoom] = useState(null);
  const [showView, setShowView] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const [form, setForm] = useState({
    roomNumber: '', floor: '', roomType: '', name: '', description: '',
    pricePerNight: '', size: '', bedType: '', view: '', status: 'available',
    amenities: '', capacity: { adults: 2, children: 0 }
  });

  useEffect(() => { loadRooms(); }, [filters]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      if (isHousekeepingOnly) {
        const [cleanRes, allRes] = await Promise.all([
          apiService.rooms.getCleaning(),
          apiService.rooms.getAll(filters.status ? { status: filters.status } : {})
        ]);
        setCleaningBoard({
          pending: cleanRes.data.data.pending || [],
          inProgress: cleanRes.data.data.inProgress || [],
          stats: cleanRes.data.data.stats || {}
        });
        setRooms(allRes.data.data.rooms);
        setStats(allRes.data.stats || {});
      } else {
        const params = {};
        if (filters.status) params.status = filters.status;
        if (filters.roomType) params.roomType = filters.roomType;
        if (filters.floor) params.floor = filters.floor;
        if (filters.search) params.search = filters.search;
        const res = await apiService.rooms.getAll(params);
        setRooms(res.data.data.rooms);
        setStats(res.data.stats || {});
      }
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCleaningProgress = async (room, progress) => {
    try {
      setActionLoading(room._id);
      await apiService.rooms.updateCleaningProgress(room._id, progress);
      const labels = { pending: 'Pending', in_progress: 'In Progress', cleaned: 'Cleaned' };
      alert.success(`Room ${room.roomNumber} → ${labels[progress]}${progress === 'cleaned' ? ' (managers notified)' : ''}`);
      loadRooms();
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdd = () => {
    setEditing(null);
    setForm({
      roomNumber: '', floor: '', roomType: '', name: '', description: '',
      pricePerNight: '', size: '', bedType: '', view: '', status: 'available',
      amenities: '', capacity: { adults: 2, children: 0 }
    });
    setShowModal(true);
  };

  const handleEdit = (room) => {
    setEditing(room._id);
    setForm({
      ...room,
      amenities: (room.amenities || []).join(', '),
      capacity: room.capacity || { adults: 2, children: 0 }
    });
    setShowModal(true);
  };

  const handleView = async (room) => {
    try {
      const res = await apiService.rooms.getById(room._id);
      setViewRoom(res.data.data.room);
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
        ...form,
        floor: Number(form.floor),
        pricePerNight: Number(form.pricePerNight),
        size: form.size ? Number(form.size) : undefined,
        amenities: form.amenities ? form.amenities.split(',').map(a => a.trim()).filter(Boolean) : [],
        capacity: {
          adults: Number(form.capacity?.adults) || 2,
          children: Number(form.capacity?.children) || 0
        }
      };

      if (editing) {
        await apiService.rooms.update(editing, payload);
        alert.success('Room updated successfully');
      } else {
        await apiService.rooms.create(payload);
        alert.success('Room added successfully');
      }
      setShowModal(false);
      loadRooms();
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (room, newStatus) => {
    try {
      await apiService.rooms.updateStatus(room._id, { status: newStatus });
      alert.success(`Room ${room.roomNumber} status changed to ${newStatus}`);
      loadRooms();
    } catch (e) {
      alert.handleApiError(e);
    }
  };

  const handleDelete = async (room) => {
    if (!window.confirm(`Are you sure you want to delete room ${room.roomNumber}?`)) return;
    try {
      await apiService.rooms.delete(room._id);
      alert.success('Room deleted');
      loadRooms();
    } catch (e) {
      alert.handleApiError(e);
    }
  };

  if (isHousekeepingOnly) {
    const boardRooms = [
      ...cleaningBoard.pending.map(r => ({ ...r, _board: 'pending' })),
      ...cleaningBoard.inProgress.map(r => ({ ...r, _board: 'in_progress' }))
    ];

    const hkColumns = [
      { key: 'roomNumber', label: 'Room #', render: v => <strong>{v}</strong> },
      { key: 'floor', label: 'Floor' },
      {
        key: 'roomType',
        label: 'Type',
        render: v => <Badge variant="info">{v?.toUpperCase()}</Badge>
      },
      {
        key: 'cleaningProgress',
        label: 'Cleaning Status',
        render: (v, r) => <CleaningProgressBadge progress={v || r._board || 'pending'} />
      },
      {
        key: 'lastCleaned',
        label: 'Last Cleaned',
        render: v => v ? formatDate(v) : <span style={{ color: 'var(--text-secondary)' }}>Never</span>
      }
    ];

    const hkActions = [
      { label: 'View', icon: <FaEye />, variant: 'default', onClick: handleView },
      {
        label: 'Start Cleaning',
        icon: <FaPlay />,
        variant: 'info',
        onClick: (r) => handleCleaningProgress(r, 'in_progress'),
        disabled: (r) => (r.cleaningProgress || 'pending') === 'in_progress' || actionLoading === r._id
      },
      {
        label: 'Mark Cleaned',
        icon: <FaCheck />,
        variant: 'success',
        onClick: (r) => handleCleaningProgress(r, 'cleaned'),
        disabled: (r) => actionLoading === r._id
      }
    ];

    return (
      <div className="rooms-page">
        <div className="maint-stats" style={{ marginBottom: '1.25rem' }}>
          <Card className="fin-card">
            <div className="fin-card-inner">
              <span className="fin-label">Pending Cleaning</span>
              <span className="fin-value warning">{cleaningBoard.stats.pending || 0}</span>
            </div>
          </Card>
          <Card className="fin-card">
            <div className="fin-card-inner">
              <span className="fin-label">In Progress</span>
              <span className="fin-value info">{cleaningBoard.stats.inProgress || 0}</span>
            </div>
          </Card>
          <Card className="fin-card">
            <div className="fin-card-inner">
              <span className="fin-label">Needs Attention</span>
              <span className="fin-value primary">{cleaningBoard.stats.total || 0}</span>
            </div>
          </Card>
        </div>

        <Card
          title="Pending Cleaning Rooms"
          subtitle="Rooms requiring immediate cleaning attention"
        >
          {loading ? (
            <div className="loading-center"><Spinner /></div>
          ) : (
            <div className="room-clean-list">
              {(cleaningBoard.pending || []).length === 0 ? (
                <div className="empty-state small">
                  <p style={{ margin: 0 }}>No pending cleaning rooms right now.</p>
                </div>
              ) : (
                cleaningBoard.pending.map(room => (
                  <div key={room._id} className="room-clean-item status-cleaning">
                    <div className="room-clean-header">
                      <strong>Room {room.roomNumber}</strong>
                      <CleaningProgressBadge progress="pending" />
                    </div>
                    <div className="room-clean-meta">
                      <span>{room.roomType ? room.roomType.charAt(0).toUpperCase() + room.roomType.slice(1) : ''}</span>
                      <span>Floor {room.floor || '-'}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Last cleaned: {room.lastCleaned ? formatDate(room.lastCleaned) : 'Never'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <Button
                        size="sm"
                        variant="info"
                        icon={<FaPlay />}
                        disabled={actionLoading === room._id}
                        onClick={() => handleCleaningProgress(room, 'in_progress')}
                      >
                        Start
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        icon={<FaCheck />}
                        disabled={actionLoading === room._id}
                        onClick={() => handleCleaningProgress(room, 'cleaned')}
                      >
                        Mark Cleaned
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        <Card
          className="mt-4"
          title="Room Cleaning Board"
          subtitle="Update cleaning status: Pending → In Progress → Cleaned"
        >
          {loading ? (
            <div className="loading-center"><Spinner /></div>
          ) : (
            <DataTable
              columns={hkColumns}
              data={boardRooms}
              actions={hkActions}
              emptyMessage="No rooms currently in the cleaning workflow"
            />
          )}
        </Card>

        <Card className="mt-4" title="All Rooms (status view)" subtitle="Housekeeping can update cleaning workflow statuses only">
          <div className="filter-bar">
            <FormSelect
              placeholder="All Status"
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
              options={[
                { value: 'cleaning', label: 'Cleaning' },
                { value: 'available', label: 'Available (Cleaned)' },
                { value: '', label: 'All Rooms' }
              ]}
            />
          </div>
          {loading ? <div className="loading-center"><Spinner /></div> : (
            <DataTable
              columns={[
                { key: 'roomNumber', label: 'Room #', render: v => <strong>{v}</strong> },
                { key: 'floor', label: 'Floor' },
                { key: 'roomType', label: 'Type', render: v => <Badge variant="info">{v?.toUpperCase()}</Badge> },
                {
                  key: 'status',
                  label: 'Room Status',
                  render: (v, r) => (
                    <select
                      className={`room-status-select status-${v}`}
                      value={v === 'cleaning' || v === 'available' ? v : v}
                      onChange={e => handleStatusChange(r, e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '12px' }}
                      disabled={!["cleaning", "available"].includes(v) && v !== 'cleaning'}
                    >
                      {v !== 'cleaning' && v !== 'available' && (
                        <option value={v} disabled>{v}</option>
                      )}
                      <option value="cleaning">Cleaning (Pending)</option>
                      <option value="available">Available (Cleaned)</option>
                    </select>
                  )
                },
                {
                  key: 'cleaningProgress',
                  label: 'Progress',
                  render: v => v ? <CleaningProgressBadge progress={v} /> : '—'
                }
              ]}
              data={rooms}
              actions={[{ label: 'View', icon: <FaEye />, variant: 'default', onClick: handleView }]}
              emptyMessage="No rooms found"
            />
          )}
        </Card>

        <Modal
          isOpen={showView}
          onClose={() => setShowView(false)}
          title={`Room ${viewRoom?.roomNumber} - Details`}
          size="md"
        >
          {viewRoom && (
            <div className="room-details">
              <div className="detail-row">
                <div><strong>Type:</strong> {viewRoom.roomType?.toUpperCase()}</div>
                <div><strong>Floor:</strong> {viewRoom.floor}</div>
              </div>
              <div className="detail-row">
                <div><strong>Status:</strong> <RoomStatusBadge status={viewRoom.status} /></div>
                <div><strong>Cleaning:</strong> <CleaningProgressBadge progress={viewRoom.cleaningProgress || (viewRoom.status === 'cleaning' ? 'pending' : undefined)} /></div>
              </div>
              <div className="detail-row">
                <div><strong>Last Cleaned:</strong> {viewRoom.lastCleaned ? formatDate(viewRoom.lastCleaned) : 'Never'}</div>
                <div><strong>Cleaned By:</strong> {viewRoom.cleanedBy?.name || '—'}</div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  const columns = [
    { key: 'roomNumber', label: 'Room #', render: v => <strong>{v}</strong>, width: '80px' },
    { key: 'floor', label: 'Floor', width: '60px' },
    {
      key: 'roomType',
      label: 'Type',
      render: v => <Badge variant="info">{v?.toUpperCase()}</Badge>
    },
    { key: 'name', label: 'Name' },
    { key: 'view', label: 'View' },
    { key: 'bedType', label: 'Bed' },
    {
      key: 'capacity',
      label: 'Capacity',
      render: v => v ? `${v.adults}A / ${v.children}C` : '-'
    },
    {
      key: 'pricePerNight',
      label: 'Price/Night',
      render: v => <strong className="text-success">{formatCurrency(v)}</strong>
    },
    {
      key: 'status',
      label: 'Status',
      render: (v, r) => (
        <select
          className={`room-status-select status-${v}`}
          value={v}
          onChange={e => handleStatusChange(r, e.target.value)}
          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '12px' }}
        >
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="cleaning">Cleaning</option>
          <option value="maintenance">Maintenance</option>
          <option value="reserved">Reserved</option>
        </select>
      )
    }
  ];

  const actions = [
    { label: 'View', icon: <FaEye />, variant: 'default', onClick: handleView },
    ...(canManageRooms ? [
      { label: 'Edit', icon: <FaEdit />, variant: 'primary', onClick: handleEdit },
      { label: 'Delete', icon: <FaTrash />, variant: 'danger', onClick: handleDelete }
    ] : [])
  ];

  const roomGrid = (
    <div className="room-grid">
      {rooms.map(room => (
        <div key={room._id} className={`room-card status-${room.status}`}>
          <div className="room-card-header">
            <div className="room-number">{room.roomNumber}</div>
            <RoomStatusBadge status={room.status} />
          </div>
          <div className="room-card-body">
            <h4 className="room-name">{room.name || room.roomType.toUpperCase()}</h4>
            <div className="room-meta">
              <span><FaBed /> {room.bedType || 'N/A'}</span>
              <span>Floor {room.floor}</span>
              <span>{room.view || ''}</span>
            </div>
            <div className="room-amenities">
              {room.amenities?.slice(0, 4).map((a, i) => (
                <span key={i} className="amenity-tag">{a}</span>
              ))}
            </div>
            <div className="room-card-footer">
              <div className="room-price">
                <span className="price-label">From</span>
                <span className="price-value">{formatCurrency(room.pricePerNight)}<small>/night</small></span>
              </div>
              <div className="room-actions">
                <button className="room-action-btn" onClick={() => handleView(room)} title="View">
                  <FaEye />
                </button>
                {canManageRooms && (
                  <button className="room-action-btn primary" onClick={() => handleEdit(room)} title="Edit">
                    <FaEdit />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="rooms-page">
      <Card
        title="Room Inventory"
        subtitle={`${stats.total || 0} total rooms • ${stats.available || 0} available • ${stats.occupied || 0} occupied • ${stats.cleaning || 0} cleaning`}
        actions={
          <>
            <Button variant="outline" icon={<FaFilter />} onClick={() => {}}>Filter View</Button>
            {canManageRooms && (
              <Button variant="primary" icon={<FaPlus />} onClick={handleAdd}>Add Room</Button>
            )}
          </>
        }
      >
        <div className="filter-bar">
          <FormSelect
            placeholder="All Status"
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
            options={[
              { value: 'available', label: 'Available' },
              { value: 'occupied', label: 'Occupied' },
              { value: 'cleaning', label: 'Cleaning' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'reserved', label: 'Reserved' }
            ]}
          />
          <FormSelect
            placeholder="All Types"
            value={filters.roomType}
            onChange={e => setFilters({ ...filters, roomType: e.target.value })}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'deluxe', label: 'Deluxe' },
              { value: 'suite', label: 'Suite' },
              { value: 'presidential', label: 'Presidential' },
              { value: 'family', label: 'Family' }
            ]}
          />
          <FormInput
            placeholder="Search rooms..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        {loading ? (
          <div className="loading-center"><Spinner /></div>
        ) : rooms.length === 0 ? (
          <div className="empty-state">
            <FaBed className="empty-icon" />
            <p>No rooms found. Try adjusting filters or add a new room.</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div className="mini-stat"><span className="ms-label">Total</span><span className="ms-value">{stats.total || 0}</span></div>
                <div className="mini-stat success"><span className="ms-label">Available</span><span className="ms-value">{stats.available || 0}</span></div>
                <div className="mini-stat danger"><span className="ms-label">Occupied</span><span className="ms-value">{stats.occupied || 0}</span></div>
                <div className="mini-stat warning"><span className="ms-label">Cleaning</span><span className="ms-value">{stats.cleaning || 0}</span></div>
                <div className="mini-stat secondary"><span className="ms-label">Maintenance</span><span className="ms-value">{stats.maintenance || 0}</span></div>
              </div>
            </div>
            {roomGrid}
            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ marginBottom: '1rem' }}>Detailed List View</h4>
              <DataTable columns={columns} data={rooms} actions={actions} />
            </div>
          </>
        )}
      </Card>

      {canManageRooms && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editing ? 'Edit Room' : 'Add New Room'}
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Spinner size="sm" /> : editing ? 'Update Room' : 'Add Room'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="form-grid-2">
            <FormInput label="Room Number" name="roomNumber" value={form.roomNumber} onChange={e => setForm({ ...form, roomNumber: e.target.value })} required />
            <FormInput label="Floor" name="floor" type="number" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} required />
            <FormSelect label="Room Type" name="roomType" value={form.roomType} onChange={e => setForm({ ...form, roomType: e.target.value })} required options={['standard', 'deluxe', 'suite', 'presidential', 'family']} />
            <FormSelect label="Status" name="status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} options={[{ value: 'available', label: 'Available' }, { value: 'occupied', label: 'Occupied' }, { value: 'cleaning', label: 'Cleaning' }, { value: 'maintenance', label: 'Maintenance' }, { value: 'reserved', label: 'Reserved' }]} />
            <FormInput label="Display Name" name="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <FormInput label="Price per Night ($)" name="pricePerNight" type="number" value={form.pricePerNight} onChange={e => setForm({ ...form, pricePerNight: e.target.value })} required />
            <FormInput label="Size (sq ft)" name="size" type="number" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} />
            <FormInput label="Bed Type" name="bedType" value={form.bedType} onChange={e => setForm({ ...form, bedType: e.target.value })} />
            <FormInput label="View" name="view" value={form.view} onChange={e => setForm({ ...form, view: e.target.value })} />
            <FormInput label="Adult Capacity" type="number" value={form.capacity?.adults} onChange={e => setForm({ ...form, capacity: { ...form.capacity, adults: e.target.value } })} />
            <FormInput label="Child Capacity" type="number" value={form.capacity?.children} onChange={e => setForm({ ...form, capacity: { ...form.capacity, children: e.target.value } })} />
            <FormInput label="Amenities (comma separated)" name="amenities" value={form.amenities} onChange={e => setForm({ ...form, amenities: e.target.value })} placeholder="WiFi, TV, AC, Mini-bar" />
            <div className="form-grid-span-2">
              <FormTextarea label="Description" name="description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}

      <Modal
        isOpen={showView}
        onClose={() => setShowView(false)}
        title={`Room ${viewRoom?.roomNumber} - Details`}
        size="md"
      >
        {viewRoom && (
          <div className="room-details">
            <div className="detail-row">
              <div><strong>Type:</strong> {viewRoom.roomType?.toUpperCase()}</div>
              <div><strong>Floor:</strong> {viewRoom.floor}</div>
            </div>
            <div className="detail-row">
              <div><strong>Bed:</strong> {viewRoom.bedType || '-'}</div>
              <div><strong>View:</strong> {viewRoom.view || '-'}</div>
            </div>
            <div className="detail-row">
              <div><strong>Size:</strong> {viewRoom.size || '-'} sq ft</div>
              <div><strong>Status:</strong> <RoomStatusBadge status={viewRoom.status} /></div>
            </div>
            <div className="detail-row">
              <div><strong>Capacity:</strong> {viewRoom.capacity?.adults || 2} Adults / {viewRoom.capacity?.children || 0} Children</div>
              <div><strong>Price/Night:</strong> <span className="text-success">{formatCurrency(viewRoom.pricePerNight)}</span></div>
            </div>
            {viewRoom.description && (
              <div className="detail-section">
                <strong>Description:</strong>
                <p>{viewRoom.description}</p>
              </div>
            )}
            {viewRoom.amenities?.length > 0 && (
              <div className="detail-section">
                <strong>Amenities:</strong>
                <div className="room-amenities">
                  {viewRoom.amenities.map((a, i) => (
                    <span key={i} className="amenity-tag">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {viewRoom.notes && (
              <div className="detail-section">
                <strong>Notes:</strong>
                <p>{viewRoom.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Rooms;
