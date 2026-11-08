import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaUserShield, FaToggleOn, FaToggleOff, FaTrash } from 'react-icons/fa';
import {
  Card, Button, DataTable, Modal, FormInput, FormSelect, FormTextarea,
  Badge, Spinner, formatDate
} from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';

const roleBadge = (role) => {
  const map = {
    admin: <Badge variant="danger">Admin</Badge>,
    manager: <Badge variant="primary">Manager</Badge>,
    receptionist: <Badge variant="info">Receptionist</Badge>,
    housekeeping: <Badge variant="warning">Housekeeping</Badge>,
    guest: <Badge variant="secondary">Guest</Badge>
  };
  return map[role] || <Badge>{role}</Badge>;
};

const Users = () => {
  const alert = useAlert();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ role: '', isActive: '' });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'receptionist', phone: '', address: ''
  });

  useEffect(() => { loadUsers(); }, [filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.role) params.role = filters.role;
      if (filters.isActive) params.isActive = filters.isActive;
      const res = await apiService.users.getAll(params);
      setUsers(res.data.data.users);
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', confirmPassword: '', role: 'receptionist', phone: '', address: '' });
    setShowModal(true);
  };

  const handleEdit = (u) => {
    setEditing(u._id);
    setForm({
      name: u.name, email: u.email, password: '', confirmPassword: '',
      role: u.role, phone: u.phone || '', address: u.address || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editing && !form.password) {
      alert.error('Password required for new user');
      return;
    }
    if (form.password && form.password !== form.confirmPassword) {
      alert.error('Passwords do not match');
      return;
    }
    if (form.password && form.password.length < 6) {
      alert.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone,
        address: form.address
      };
      if (form.password) payload.password = form.password;

      if (editing) {
        await apiService.users.update(editing, payload);
        alert.success('User updated');
      } else {
        await apiService.users.create(payload);
        alert.success('User created');
      }
      setShowModal(false);
      loadUsers();
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (u) => {
    try {
      if (u.isActive) {
        await apiService.users.deactivate(u._id);
        alert.success('User deactivated');
      } else {
        await apiService.users.activate(u._id);
        alert.success('User activated');
      }
      loadUsers();
    } catch (e) {
      alert.handleApiError(e);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user ${u.name}?`)) return;
    try {
      await apiService.users.delete(u._id);
      alert.success('User deleted');
      loadUsers();
    } catch (e) {
      alert.handleApiError(e);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Staff Member',
      render: (_, r) => (
        <div className="guest-cell">
          <div className="guest-avatar-sm" style={{ background: '#6366f1' }}>{r.name.charAt(0)}</div>
          <div>
            <strong>{r.name}</strong>
            <small>{r.email}</small>
          </div>
        </div>
      )
    },
    { key: 'phone', label: 'Phone', render: v => v || '-' },
    { key: 'role', label: 'Role', render: v => roleBadge(v) },
    {
      key: 'isActive',
      label: 'Status',
      render: v => v ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>
    },
    { key: 'lastLogin', label: 'Last Login', render: v => v ? formatDate(v, 'full') : 'Never' },
    { key: 'createdAt', label: 'Created', render: v => formatDate(v) }
  ];

  const actions = [
    { label: 'Edit', icon: <FaEdit />, variant: 'primary', onClick: handleEdit },
    {
      label: 'Toggle',
      icon: r => r.isActive ? <FaToggleOn /> : <FaToggleOff />,
      variant: r => r.isActive ? 'warning' : 'success',
      onClick: toggleActive
    },
    { label: 'Delete', icon: <FaTrash />, variant: 'danger', onClick: handleDelete }
  ];

  return (
    <div className="users-page">
      <Card
        title="Staff Management"
        subtitle="Create and manage staff accounts with role-based access"
        icon={<FaUserShield />}
        actions={<Button variant="primary" icon={<FaPlus />} onClick={handleAdd}>Add Staff Member</Button>}
      >
        <div className="filter-bar">
          <FormSelect
            placeholder="All Roles"
            value={filters.role}
            onChange={e => setFilters({ ...filters, role: e.target.value })}
            options={['admin', 'manager', 'receptionist', 'housekeeping', 'guest']}
          />
          <FormSelect
            placeholder="All Status"
            value={filters.isActive}
            onChange={e => setFilters({ ...filters, isActive: e.target.value })}
            options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]}
          />
        </div>

        {loading ? <div className="loading-center"><Spinner /></div> : (
          <DataTable columns={columns} data={users} actions={actions} emptyMessage="No users found" />
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Staff Member' : 'Add Staff Member'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : editing ? 'Update User' : 'Create User'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <FormInput label="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <FormInput label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            <FormSelect
              label="Role"
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              options={[
                { value: 'admin', label: 'Administrator (Full Access)' },
                { value: 'manager', label: 'Manager' },
                { value: 'receptionist', label: 'Receptionist / Front Desk' },
                { value: 'housekeeping', label: 'Housekeeping / Maintenance' }
              ]}
            />
            <FormInput label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <div className="form-grid-span-2">
              <FormTextarea label="Address" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <FormInput label={editing ? "New Password (leave blank to keep)" : "Password"} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editing} />
            <FormInput label={editing ? "Confirm New Password" : "Confirm Password"} type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required={!editing || form.password} />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
