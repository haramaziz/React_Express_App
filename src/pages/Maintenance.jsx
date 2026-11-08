import { useState, useEffect } from 'react';
import {
  FaPlus, FaEye, FaUserCog, FaPlay, FaCheck, FaTimes, FaTrash, FaEdit, FaClock
} from 'react-icons/fa';
import {
  Card, Button, DataTable, Modal, FormInput, FormSelect, FormTextarea,
  Badge, Spinner, formatDate
} from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';

const Maintenance = () => {
  const alert = useAlert();
  const { hasRole, user } = useAuth();
  const isHousekeepingOnly = hasRole('housekeeping');
  const canManage = hasRole('admin', 'manager');
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    scope: isHousekeepingOnly ? 'all' : '',
    assignedTo: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [form, setForm] = useState({
    room: '',
    category: isHousekeepingOnly ? 'cleaning' : 'plumbing',
    priority: 'medium',
    title: '',
    description: '',
    assignedTo: ''
  });
  const [assignForm, setAssignForm] = useState({ assignedTo: '' });
  const [completeForm, setCompleteForm] = useState({ resolutionNotes: '', actualCost: '' });
  const [statusForm, setStatusForm] = useState({
    status: 'in_progress',
    resolutionNotes: '',
    actualCost: ''
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    const handleRefresh = () => loadData();
    window.addEventListener('refresh-maintenance', handleRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-maintenance', handleRefresh);
    };
  }, [filters]);

  const loadData = async () => {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.category) params.category = filters.category;
      if (filters.scope === 'mine') params.mine = 'true';
      if (filters.scope === 'unassigned') params.scope = 'unassigned';
      if (filters.assignedTo) params.assignedTo = filters.assignedTo;

      const requests = [
        apiService.maintenance.getAll(params),
        apiService.rooms.getAll({})
      ];
      if (canManage) {
        requests.push(apiService.users.getAll({ role: 'housekeeping' }));
      }

      const [tRes, rRes, uRes] = await Promise.all(requests);
      setTickets(tRes.data.data.requests || []);
      setStats(tRes.data.stats || {});
      setRooms(rRes.data.data.rooms || []);
      if (uRes) setStaffList(uRes.data.data.users || []);
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setLoading(false);
    }
  };

  const priorityBadge = (p) => {
    const map = {
      low: <Badge variant="secondary">LOW</Badge>,
      medium: <Badge variant="info">MEDIUM</Badge>,
      high: <Badge variant="warning">HIGH</Badge>,
      urgent: <Badge variant="danger">URGENT</Badge>
    };
    return map[p] || <Badge>{p}</Badge>;
  };

  const statusBadge = (s) => {
    const map = {
      pending: <Badge variant="warning">Pending</Badge>,
      assigned: <Badge variant="info">Assigned</Badge>,
      in_progress: <Badge variant="primary">In Progress</Badge>,
      completed: <Badge variant="success">Completed</Badge>,
      cancelled: <Badge variant="secondary">Cancelled</Badge>
    };
    return map[s] || <Badge>{s}</Badge>;
  };

  const isMineOrUnassigned = (t) => {
    if (!isHousekeepingOnly) return true;
    if (!t.assignedTo) return true;
    const assigneeId = t.assignedTo._id || t.assignedTo;
    return String(assigneeId) === String(user?._id);
  };

  const handleAdd = () => {
    setForm({
      room: '',
      category: isHousekeepingOnly ? 'cleaning' : 'plumbing',
      priority: 'medium',
      title: '',
      description: '',
      assignedTo: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiService.maintenance.create({
        ...form,
        room: form.room ? form.room : null,
        assignedTo: canManage && form.assignedTo ? form.assignedTo : undefined
      });
      alert.success(
        isHousekeepingOnly
          ? 'Work order created — management notified'
          : (form.assignedTo ? 'Task created and assigned — housekeeping notified' : 'Task created successfully')
      );
      setShowModal(false);
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      loadData();
    } catch (err) {
      alert.handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = async (t) => {
    try {
      const res = await apiService.maintenance.getById(t._id);
      setActiveTicket(res.data.data.request);
      setShowView(true);
    } catch (err) {
      alert.handleApiError(err);
    }
  };

  const openAssign = (t) => {
    setActiveTicket(t);
    setAssignForm({ assignedTo: t.assignedTo?._id || '' });
    setShowAssign(true);
  };

  const submitAssign = async () => {
    try {
      setSubmitting(true);
      await apiService.maintenance.assign(activeTicket._id, assignForm.assignedTo);
      alert.success('Task assigned — housekeeping staff notified');
      setShowAssign(false);
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      loadData();
    } catch (err) {
      alert.handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStart = async (t) => {
    try {
      await apiService.maintenance.start(t._id);
      alert.success('Task marked in progress');
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      loadData();
    } catch (err) {
      alert.handleApiError(err);
    }
  };

  const openComplete = (t) => {
    setActiveTicket(t);
    setCompleteForm({ resolutionNotes: '', actualCost: t.estimatedCost || '' });
    setShowComplete(true);
  };

  const submitComplete = async () => {
    if (!completeForm.resolutionNotes?.trim()) {
      alert.error('Please enter resolution notes before completing the task');
      return;
    }
    try {
      setSubmitting(true);
      await apiService.maintenance.complete(activeTicket._id, completeForm);
      alert.success('Task completed — managers and admins have been notified');
      setShowComplete(false);
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      loadData();
    } catch (err) {
      alert.handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const openStatusModal = (t) => {
    setActiveTicket(t);
    setStatusForm({
      status: t.status === 'assigned' ? 'in_progress' : t.status,
      resolutionNotes: t.resolutionNotes || '',
      actualCost: t.actualCost !== undefined && t.actualCost !== null ? t.actualCost : (t.estimatedCost || '')
    });
    setShowStatusModal(true);
  };

  const submitStatusModal = async () => {
    if (statusForm.status === 'completed' && !statusForm.resolutionNotes?.trim()) {
      alert.error('Please enter resolution notes before marking the task as completed');
      return;
    }
    try {
      setSubmitting(true);
      await apiService.maintenance.updateStatus(activeTicket._id, statusForm);
      if (statusForm.status === 'completed') {
        alert.success('Task marked as completed — managers and admins have been notified');
      } else {
        alert.success(`Task status updated to ${statusForm.status.replace('_', ' ')}`);
      }
      setShowStatusModal(false);
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      loadData();
    } catch (err) {
      alert.handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (t) => {
    if (!window.confirm('Cancel this request?')) return;
    try {
      await apiService.maintenance.cancel(t._id);
      alert.success('Request cancelled');
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      loadData();
    } catch (err) {
      alert.handleApiError(err);
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm('Delete this request?')) return;
    try {
      await apiService.maintenance.delete(t._id);
      alert.success('Request deleted');
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      loadData();
    } catch (err) {
      alert.handleApiError(err);
    }
  };

  const columns = [
    { key: 'requestNumber', label: 'Ref #', render: v => <strong style={{ color: '#ef4444' }}>{v}</strong> },
    {
      key: 'room',
      label: 'Location',
      render: v => v ? `Room ${v.roomNumber}` : 'N/A'
    },
    {
      key: 'title',
      label: 'Issue',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.title}</div>
          <small style={{ color: '#6b7280' }}>{r.description?.substring(0, 50)}...</small>
        </div>
      )
    },
    { key: 'category', label: 'Category', render: v => <Badge variant="info">{v}</Badge> },
    { key: 'priority', label: 'Priority', render: v => priorityBadge(v) },
    {
      key: 'assignedTo',
      label: 'Assigned',
      render: v => v ? v.name || v : <span style={{ color: '#9ca3af' }}>Unassigned (Pool)</span>
    },
    { key: 'status', label: 'Status', render: v => statusBadge(v) },
    { key: 'reportedAt', label: 'Reported', render: v => formatDate(v) }
  ];

  const actions = [
    { label: 'View', icon: <FaEye />, variant: 'default', onClick: handleView },
    ...(canManage ? [
      { label: 'Assign', icon: <FaUserCog />, variant: 'primary', onClick: openAssign, disabled: r => ['completed', 'cancelled'].includes(r.status) }
    ] : []),
    {
      label: 'Start',
      icon: <FaPlay />,
      variant: 'info',
      onClick: handleStart,
      disabled: r => !['assigned', 'pending'].includes(r.status) || !isMineOrUnassigned(r)
    },
    {
      label: 'Complete',
      icon: <FaCheck />,
      variant: 'success',
      onClick: openComplete,
      disabled: r => r.status === 'completed' || r.status === 'cancelled' || !isMineOrUnassigned(r)
    },
    {
      label: 'Status',
      icon: <FaEdit />,
      variant: 'default',
      onClick: openStatusModal,
      disabled: r => r.status === 'cancelled' || !isMineOrUnassigned(r)
    },
    ...(canManage ? [
      { label: 'Cancel', icon: <FaTimes />, variant: 'danger', onClick: handleCancel, disabled: r => ['completed', 'cancelled'].includes(r.status) }
    ] : []),
    ...(hasRole('admin') ? [
      { label: 'Delete', icon: <FaTrash />, variant: 'danger', onClick: handleDelete }
    ] : [])
  ];

  return (
    <div className="maintenance-page">
      <div className="maint-stats">
        <Card className="fin-card"><div className="fin-card-inner"><span className="fin-label">Total</span><span className="fin-value primary">{stats.total || 0}</span></div></Card>
        <Card className="fin-card"><div className="fin-card-inner"><span className="fin-label">Pending</span><span className="fin-value warning">{stats.pending || 0}</span></div></Card>
        <Card className="fin-card"><div className="fin-card-inner"><span className="fin-label">In Progress</span><span className="fin-value info">{stats.inProgress || 0}</span></div></Card>
        <Card className="fin-card"><div className="fin-card-inner"><span className="fin-label">Completed</span><span className="fin-value success">{stats.completed || 0}</span></div></Card>
        <Card className="fin-card"><div className="fin-card-inner"><span className="fin-label">URGENT</span><span className="fin-value" style={{ color: '#ef4444', fontWeight: 700 }}>{stats.urgent || 0}</span></div></Card>
      </div>

      <Card
        title={isHousekeepingOnly ? 'Housekeeping & Maintenance Work Orders' : 'Maintenance & Housekeeping Requests'}
        subtitle={isHousekeepingOnly
          ? 'Manage tasks assigned to you or your department pool. Change status (Pending → In Progress → Completed) and record resolution notes.'
          : 'Create and assign work orders to housekeeping. Automated notifications are sent upon assignment and completion.'}
        actions={
          <Button variant="primary" icon={<FaPlus />} onClick={handleAdd}>
            {isHousekeepingOnly ? 'Report Issue / Task' : 'New Request'}
          </Button>
        }
      >
        <div className="filter-bar">
          <FormSelect
            placeholder="All Status"
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
            options={['pending', 'assigned', 'in_progress', 'completed', 'cancelled']}
          />
          <FormSelect
            placeholder="All Priorities"
            value={filters.priority}
            onChange={e => setFilters({ ...filters, priority: e.target.value })}
            options={[
              { value: 'low', label: 'LOW' },
              { value: 'medium', label: 'MEDIUM' },
              { value: 'high', label: 'HIGH' },
              { value: 'urgent', label: 'URGENT' }
            ]}
          />
          {isHousekeepingOnly ? (
            <FormSelect
              placeholder="Task Scope"
              value={filters.scope}
              onChange={e => setFilters({ ...filters, scope: e.target.value })}
              options={[
                { value: 'all', label: 'All Department Tasks' },
                { value: 'mine', label: 'Assigned to Me' },
                { value: 'unassigned', label: 'Unassigned Pool' }
              ]}
            />
          ) : (
            <FormSelect
              placeholder="All Assignees"
              value={filters.assignedTo}
              onChange={e => setFilters({ ...filters, assignedTo: e.target.value })}
              options={[
                { value: '', label: 'All Assignees' },
                { value: 'unassigned', label: 'Unassigned Pool' },
                ...staffList.map(s => ({ value: s._id, label: s.name }))
              ]}
            />
          )}
          <FormSelect
            placeholder="All Categories"
            value={filters.category}
            onChange={e => setFilters({ ...filters, category: e.target.value })}
            options={['plumbing', 'electrical', 'hvac', 'furniture', 'appliance', 'structural', 'cleaning', 'other']}
          />
        </div>

        {loading ? <div className="loading-center"><Spinner /></div> : (
          <DataTable
            columns={columns}
            data={tickets}
            actions={actions}
            emptyMessage={isHousekeepingOnly ? 'No maintenance or cleaning tasks in your queue' : 'No maintenance requests'}
          />
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isHousekeepingOnly ? 'Create / Report Maintenance Task' : 'New Maintenance Request'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Submit Request'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <FormSelect
              label="Affected Room (optional)"
              value={form.room}
              onChange={e => setForm({ ...form, room: e.target.value })}
              options={[{ value: '', label: 'Not room-specific' }, ...rooms.map(r => ({ value: r._id, label: `Room ${r.roomNumber} - ${r.roomType}` }))]}
            />
            <FormSelect
              label="Category"
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              options={['cleaning', 'plumbing', 'electrical', 'hvac', 'furniture', 'appliance', 'structural', 'other']}
            />
            <FormSelect
              label="Priority"
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              options={[
                { value: 'low', label: 'LOW' },
                { value: 'medium', label: 'MEDIUM' },
                { value: 'high', label: 'HIGH' },
                { value: 'urgent', label: 'URGENT - Immediate attention' }
              ]}
            />
            {canManage ? (
              <FormSelect
                label="Assign to Housekeeping"
                value={form.assignedTo}
                onChange={e => setForm({ ...form, assignedTo: e.target.value })}
                placeholder="Unassigned (notify department)"
                options={staffList.map(s => ({ value: s._id, label: `${s.name} (${s.role})` }))}
              />
            ) : (
              <div></div>
            )}
            <div className="form-grid-span-2">
              <FormInput
                label="Short Title / Summary"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
                placeholder="e.g. Deep clean after checkout, or leaking bathroom faucet"
              />
            </div>
            <div className="form-grid-span-2">
              <FormTextarea
                label="Detailed Description"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                required
                placeholder="Describe the work needed..."
                rows={5}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={showView}
        onClose={() => setShowView(false)}
        title={`Work Order ${activeTicket?.requestNumber || ''}`}
        size="lg"
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'space-between' }}>
            <Button variant="outline" onClick={() => setShowView(false)}>Close</Button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {activeTicket && ['pending', 'assigned'].includes(activeTicket.status) && isMineOrUnassigned(activeTicket) && (
                <Button variant="info" onClick={() => { setShowView(false); handleStart(activeTicket); }}>
                  Start Task
                </Button>
              )}
              {activeTicket && activeTicket.status !== 'completed' && activeTicket.status !== 'cancelled' && isMineOrUnassigned(activeTicket) && (
                <Button variant="success" onClick={() => { setShowView(false); openComplete(activeTicket); }}>
                  Mark Completed
                </Button>
              )}
              {activeTicket && activeTicket.status !== 'cancelled' && isMineOrUnassigned(activeTicket) && (
                <Button variant="primary" onClick={() => { setShowView(false); openStatusModal(activeTicket); }}>
                  Update Status / Notes
                </Button>
              )}
            </div>
          </div>
        }
      >
        {activeTicket && (
          <div className="maint-details">
            <div className="detail-header">
              <div style={{ flex: 1 }}>
                <h2>{activeTicket.title}</h2>
                <div style={{ marginTop: '0.5rem' }}>
                  {priorityBadge(activeTicket.priority)} {statusBadge(activeTicket.status)}
                  <Badge variant="info" style={{ marginLeft: '8px' }}>{activeTicket.category}</Badge>
                </div>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-block">
                <h4>Information</h4>
                <p><strong>Room:</strong> {activeTicket.room ? `Room ${activeTicket.room.roomNumber}` : 'N/A'}</p>
                <p><strong>Reported:</strong> {formatDate(activeTicket.reportedAt, 'full')}</p>
                <p><strong>Reported By:</strong> {activeTicket.reportedBy?.name || 'Staff'}</p>
                {activeTicket.reportedByGuest && <p><strong>Guest Reported:</strong> {activeTicket.reportedByGuest.firstName}</p>}
              </div>
              <div className="detail-block">
                <h4>Assignment</h4>
                <p><strong>Assigned To:</strong> {activeTicket.assignedTo?.name || 'Unassigned (Department Pool)'}</p>
                {activeTicket.assignedAt && <p><strong>Assigned At:</strong> {formatDate(activeTicket.assignedAt, 'full')}</p>}
                {activeTicket.startedAt && <p><strong>Started:</strong> {formatDate(activeTicket.startedAt, 'full')}</p>}
                {activeTicket.completedAt && <p><strong>Completed:</strong> {formatDate(activeTicket.completedAt, 'full')}</p>}
              </div>
              <div className="detail-block">
                <h4>Costs</h4>
                <p><strong>Estimated:</strong> ${activeTicket.estimatedCost || 0}</p>
                <p><strong>Actual:</strong> ${activeTicket.actualCost || 0}</p>
              </div>
              <div className="detail-block">
                <h4>Follow-up</h4>
                <p><strong>Required:</strong> {activeTicket.followUpRequired ? 'YES' : 'No'}</p>
                {activeTicket.followUpDate && <p><strong>Follow-up Date:</strong> {formatDate(activeTicket.followUpDate)}</p>}
              </div>
            </div>

            <div className="detail-section">
              <h4>Issue Description</h4>
              <p style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #6366f1' }}>
                {activeTicket.description}
              </p>
            </div>

            {activeTicket.resolutionNotes && (
              <div className="detail-section">
                <h4>Resolution Notes</h4>
                <p style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                  {activeTicket.resolutionNotes}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Assign Modal (Managers) */}
      {canManage && (
        <Modal
          isOpen={showAssign}
          onClose={() => setShowAssign(false)}
          title="Assign Work Order to Housekeeping"
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
              <Button variant="primary" onClick={submitAssign} disabled={submitting}>
                {submitting ? <Spinner size="sm" /> : 'Assign Staff'}
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Assign <strong>{activeTicket?.title}</strong> to a housekeeping staff member. They will receive an immediate automated system notification.
            </p>
            <FormSelect
              label="Select Housekeeping Staff"
              value={assignForm.assignedTo}
              onChange={e => setAssignForm({ ...assignForm, assignedTo: e.target.value })}
              options={staffList.map(s => ({ value: s._id, label: `${s.name} (${s.role})` }))}
              required
            />
          </div>
        </Modal>
      )}

      {/* Complete Task Modal */}
      <Modal
        isOpen={showComplete}
        onClose={() => setShowComplete(false)}
        title={`Complete Task ${activeTicket?.requestNumber || ''}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowComplete(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitComplete} disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Confirm & Mark Completed'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Completing <strong>{activeTicket?.title}</strong>. An automated completion alert will be sent to the Manager and Admin dashboard in real time.
          </p>
          <div className="form-grid-2">
            <FormInput
              label="Actual Cost ($)"
              type="number"
              value={completeForm.actualCost}
              onChange={e => setCompleteForm({ ...completeForm, actualCost: e.target.value })}
              placeholder="0.00"
            />
            <div className="form-grid-span-2">
              <FormTextarea
                label="Resolution Notes *"
                rows={4}
                value={completeForm.resolutionNotes}
                onChange={e => setCompleteForm({ ...completeForm, resolutionNotes: e.target.value })}
                placeholder="Describe the actions taken to resolve the issue (e.g. replaced washer, sanitized room, repaired fixture)..."
                required
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Change Status & Details Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={`Update Task Status — ${activeTicket?.requestNumber || ''}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitStatusModal} disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Save Status & Details'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Update the lifecycle status and details for <strong>{activeTicket?.title}</strong>.
          </p>
          <div className="form-grid-2">
            <FormSelect
              label="Task Status"
              value={statusForm.status}
              onChange={e => setStatusForm({ ...statusForm, status: e.target.value })}
              options={[
                { value: 'pending', label: 'Pending — Waiting to start' },
                { value: 'in_progress', label: 'In Progress — Currently working' },
                { value: 'completed', label: 'Completed — Finished / Resolved' }
              ]}
            />
            <FormInput
              label="Actual Cost ($)"
              type="number"
              value={statusForm.actualCost}
              onChange={e => setStatusForm({ ...statusForm, actualCost: e.target.value })}
              placeholder="0.00"
            />
            <div className="form-grid-span-2">
              <FormTextarea
                label={`Resolution Notes ${statusForm.status === 'completed' ? '*' : '(optional)'}`}
                rows={4}
                value={statusForm.resolutionNotes}
                onChange={e => setStatusForm({ ...statusForm, resolutionNotes: e.target.value })}
                placeholder="Enter details or notes regarding the task status and resolution..."
                required={statusForm.status === 'completed'}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Maintenance;
