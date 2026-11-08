import { useState, useRef } from 'react';
import {
  FaUserEdit,
  FaLock,
  FaSave,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaCamera
} from 'react-icons/fa';
import { Card, Button, FormInput, FormTextarea, Spinner, Badge, formatDate } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { resolveMediaUrl } from '../utils/media';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

const Profile = () => {
  const { user, updateProfile, updatePassword, updateAvatar } = useAuth();
  const alert = useAlert();
  const fileRef = useRef(null);

  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const avatarSrc = preview || resolveMediaUrl(user?.avatar);

  const handleSaveProfile = async () => {
    setSaving(true);
    await updateProfile(profileForm);
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      alert.error('New password must be at least 6 characters');
      return;
    }
    setSaving(true);
    const ok = await updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
    if (ok) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
    setSaving(false);
  };

  const onFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert.error('Please upload a JPG or PNG image');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      alert.error('Image must be 5MB or smaller');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile) {
      alert.error('Choose a photo to upload');
      return;
    }
    setUploading(true);
    const ok = await updateAvatar(selectedFile);
    if (ok) {
      setPreview(null);
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
    }
    setUploading(false);
  };

  const roleColors = {
    admin: 'bg-gradient-to-r from-red-500 to-pink-500',
    manager: 'bg-gradient-to-r from-indigo-500 to-purple-500',
    receptionist: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    housekeeping: 'bg-gradient-to-r from-amber-500 to-orange-500',
    guest: 'bg-gradient-to-r from-gray-500 to-slate-500'
  };

  return (
    <div className="profile-page public-section">
      <Card className="profile-header-card">
        <div className="profile-header">
          <div className="profile-avatar-wrap">
            {avatarSrc ? (
              <img src={avatarSrc} alt={user?.name || 'Profile'} className="profile-avatar-xl profile-avatar-photo" />
            ) : (
              <div className={`profile-avatar-xl ${roleColors[user?.role] || 'bg-gray-500'}`}>
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <button
              type="button"
              className="profile-avatar-upload-btn"
              onClick={() => fileRef.current?.click()}
              aria-label="Choose profile photo"
            >
              <FaCamera />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              className="sr-only"
              onChange={onFilePicked}
            />
          </div>
          <div className="profile-info">
            <h1 style={{ margin: 0 }}>{user?.name}</h1>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Badge variant="primary">{user?.role?.toUpperCase()}</Badge>
              {user?.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}
              {user?.lastLogin && (
                <Badge variant="info"><FaCalendarAlt style={{ marginRight: '4px' }} /> Last login: {formatDate(user.lastLogin, 'full')}</Badge>
              )}
            </div>
            <div className="profile-avatar-actions">
              <Button
                variant="outline"
                size="sm"
                icon={<FaCamera />}
                onClick={() => fileRef.current?.click()}
              >
                Choose Photo
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={uploading ? <Spinner size="sm" /> : <FaSave />}
                onClick={handleUploadAvatar}
                disabled={uploading || !selectedFile}
              >
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </Button>
              <span className="profile-avatar-hint">JPG/PNG · max 5MB</span>
            </div>
          </div>
        </div>

        <div className="profile-contact">
          <div className="pc-item"><FaEnvelope /> {user?.email}</div>
          <div className="pc-item"><FaPhone /> {user?.phone || 'No phone'}</div>
          <div className="pc-item"><FaMapMarkerAlt /> {user?.address || 'No address set'}</div>
          <div className="pc-item"><FaCalendarAlt /> Member since: {formatDate(user?.createdAt)}</div>
        </div>
      </Card>

      <div className="profile-tabs">
        <button className={`ptab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
          <FaUserEdit /> Edit Profile
        </button>
        <button className={`ptab ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>
          <FaLock /> Change Password
        </button>
      </div>

      {tab === 'profile' && (
        <Card
          title="Personal Information"
          actions={
            <Button variant="primary" icon={saving ? <Spinner size="sm" /> : <FaSave />} onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          }
        >
          <div className="form-grid-2">
            <FormInput label="Full Name" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
            <FormInput label="Email Address" type="email" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} />
            <FormInput label="Phone Number" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
            <div></div>
            <div className="form-grid-span-2">
              <FormTextarea label="Address" rows={3} value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} />
            </div>
          </div>
        </Card>
      )}

      {tab === 'password' && (
        <Card
          title="Change Password"
          subtitle="For your account security, we recommend using a strong password you don't use elsewhere"
          actions={
            <Button variant="primary" icon={saving ? <Spinner size="sm" /> : <FaSave />} onClick={handleChangePassword} disabled={saving}>
              {saving ? 'Updating...' : 'Update Password'}
            </Button>
          }
        >
          <div className="form-grid-2">
            <FormInput label="Current Password" type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
            <div></div>
            <FormInput label="New Password" type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
            <FormInput label="Confirm New Password" type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
          </div>
          <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
            <h4 style={{ color: '#0369a1', marginTop: 0 }}>Password Requirements</h4>
            <ul style={{ color: '#075985', margin: 0, paddingLeft: '1.25rem' }}>
              <li>Minimum 6 characters (8+ recommended)</li>
              <li>Include uppercase and lowercase letters</li>
              <li>Include numbers and special characters</li>
              <li>Do not reuse passwords from other accounts</li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Profile;
