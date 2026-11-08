import { useState, useEffect } from 'react';
import { FaSave, FaMoneyBill, FaShieldAlt, FaHotel, FaBell, FaPlug } from 'react-icons/fa';
import { Card, Button, FormInput, FormSelect, FormTextarea, Spinner, Badge } from '../components/common';
import { useAlert } from '../contexts/AlertContext';
import * as apiService from '../services/api';

const Settings = () => {
  const alert = useAlert();
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [general, setGeneral] = useState({
    hotelName: 'LuxuryStay Hospitality',
    hotelAddress: '123 Luxury Avenue, Suite 100, Beverly Hills, CA 90210',
    hotelPhone: '+1 (555) 123-4567',
    hotelEmail: 'info@luxurystay.com',
    website: 'www.luxurystay.com',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    maxOccupancyOverride: false
  });

  const [pricing, setPricing] = useState({
    defaultTaxRate: 10,
    serviceCharge: 15,
    cancellationPolicyHours: 24,
    lateCheckoutFee: 50,
    earlyCheckinFee: 30,
    extraBedFee: 25,
    weekendPremium: 10,
    minStay: 1,
    maxStay: 60
  });

  const [notifications, setNotifications] = useState({
    emailBookingConfirmation: true,
    emailBookingCancellation: true,
    emailCheckinReminder: true,
    emailCheckoutFollowup: true,
    emailMaintenanceAlert: true,
    smsLowInventory: true,
    smsUrgentMaintenance: true,
    autoAssignHousekeeping: true,
    maintenanceNotifyAll: false
  });

  const [security, setSecurity] = useState({
    sessionTimeout: 30,
    passwordMinLength: 8,
    requireStrongPassword: true,
    twoFactorForAdmin: true,
    loginAttemptsAllowed: 5,
    ipLockoutThreshold: 10,
    autoLogoutEnabled: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await apiService.settings.get();
      const s = res.data?.data?.settings;
      if (s) {
        if (s.general) setGeneral(prev => ({ ...prev, ...s.general }));
        if (s.pricing) setPricing(prev => ({ ...prev, ...s.pricing }));
        if (s.notifications) setNotifications(prev => ({ ...prev, ...s.notifications }));
        if (s.security) setSecurity(prev => ({ ...prev, ...s.security }));
      }
    } catch (err) {
      alert.handleApiError(err, 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <FaHotel /> },
    { id: 'pricing', label: 'Pricing & Policies', icon: <FaMoneyBill /> },
    { id: 'notifications', label: 'Notifications', icon: <FaBell /> },
    { id: 'security', label: 'Security', icon: <FaShieldAlt /> },
    { id: 'integrations', label: 'Integrations', icon: <FaPlug /> }
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.settings.update({ general, pricing, notifications, security });
      alert.success('Settings saved successfully!');
    } catch (err) {
      alert.handleApiError(err, 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleNotif = (key) => {
    setNotifications({ ...notifications, [key]: !notifications[key] });
  };

  const toggleSec = (key) => {
    setSecurity({ ...security, [key]: !security[key] });
  };

  if (loading) {
    return (
      <div className="loading-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-layout">
        <Card className="settings-sidebar">
          <div className="settings-nav">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                className={`settings-nav-item ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="settings-actions">
            <Button
              variant="primary"
              icon={saving ? <Spinner size="sm" /> : <FaSave />}
              onClick={handleSave}
              disabled={saving}
              fullWidth
            >
              {saving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        </Card>

        <div className="settings-content">
          {activeTab === 'general' && (
            <Card title="General Settings" subtitle="Core hotel information and operating parameters" icon={<FaHotel />}>
              <div className="form-grid-2">
                <FormInput label="Hotel Name" value={general.hotelName} onChange={e => setGeneral({ ...general, hotelName: e.target.value })} />
                <FormInput label="Website URL" value={general.website} onChange={e => setGeneral({ ...general, website: e.target.value })} />
                <div className="form-grid-span-2">
                  <FormTextarea label="Hotel Address" rows={2} value={general.hotelAddress} onChange={e => setGeneral({ ...general, hotelAddress: e.target.value })} />
                </div>
                <FormInput label="Phone Number" value={general.hotelPhone} onChange={e => setGeneral({ ...general, hotelPhone: e.target.value })} />
                <FormInput label="Contact Email" type="email" value={general.hotelEmail} onChange={e => setGeneral({ ...general, hotelEmail: e.target.value })} />
                <FormInput label="Standard Check-in Time" type="time" value={general.checkInTime} onChange={e => setGeneral({ ...general, checkInTime: e.target.value })} />
                <FormInput label="Standard Check-out Time" type="time" value={general.checkOutTime} onChange={e => setGeneral({ ...general, checkOutTime: e.target.value })} />
                <FormSelect
                  label="Default Timezone"
                  value={general.timezone}
                  onChange={e => setGeneral({ ...general, timezone: e.target.value })}
                  options={[
                    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
                    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Singapore'
                  ]}
                />
                <FormSelect
                  label="Default Currency"
                  value={general.currency}
                  onChange={e => setGeneral({ ...general, currency: e.target.value })}
                  options={[
                    { value: 'USD', label: 'US Dollar ($)' },
                    { value: 'EUR', label: 'Euro (€)' },
                    { value: 'GBP', label: 'British Pound (£)' },
                    { value: 'JPY', label: 'Japanese Yen (¥)' },
                    { value: 'AUD', label: 'Australian Dollar ($)' }
                  ]}
                />
              </div>
            </Card>
          )}

          {activeTab === 'pricing' && (
            <Card title="Pricing & Policies" subtitle="Tax rates, fees, and booking policies" icon={<FaMoneyBill />}>
              <div className="form-grid-2">
                <FormInput label="Default Tax Rate (%)" type="number" value={pricing.defaultTaxRate} onChange={e => setPricing({ ...pricing, defaultTaxRate: Number(e.target.value) })} />
                <FormInput label="Service Charge (%)" type="number" value={pricing.serviceCharge} onChange={e => setPricing({ ...pricing, serviceCharge: Number(e.target.value) })} />
                <FormInput label="Cancellation Cut-off (hours)" type="number" value={pricing.cancellationPolicyHours} onChange={e => setPricing({ ...pricing, cancellationPolicyHours: Number(e.target.value) })} />
                <FormInput label="Late Checkout Fee ($)" type="number" value={pricing.lateCheckoutFee} onChange={e => setPricing({ ...pricing, lateCheckoutFee: Number(e.target.value) })} />
                <FormInput label="Early Check-in Fee ($)" type="number" value={pricing.earlyCheckinFee} onChange={e => setPricing({ ...pricing, earlyCheckinFee: Number(e.target.value) })} />
                <FormInput label="Extra Bed / Person ($)" type="number" value={pricing.extraBedFee} onChange={e => setPricing({ ...pricing, extraBedFee: Number(e.target.value) })} />
                <FormInput label="Weekend Premium (%)" type="number" value={pricing.weekendPremium} onChange={e => setPricing({ ...pricing, weekendPremium: Number(e.target.value) })} />
                <div></div>
                <FormInput label="Minimum Stay (nights)" type="number" value={pricing.minStay} onChange={e => setPricing({ ...pricing, minStay: Number(e.target.value) })} />
                <FormInput label="Maximum Stay (nights)" type="number" value={pricing.maxStay} onChange={e => setPricing({ ...pricing, maxStay: Number(e.target.value) })} />
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card title="Notification Settings" subtitle="Configure automated alerts and communications" icon={<FaBell />}>
              <div className="notification-toggles">
                <h4 style={{ marginTop: 0, color: 'var(--primary)' }}>Email Notifications</h4>
                {[
                  { k: 'emailBookingConfirmation', label: 'Booking Confirmation to Guests', desc: 'Send confirmation email when a new booking is created' },
                  { k: 'emailBookingCancellation', label: 'Booking Cancellation Notice', desc: 'Notify guests and staff when a booking is cancelled' },
                  { k: 'emailCheckinReminder', label: 'Pre Check-in Reminder', desc: '24hr before check-in email with check-in info' },
                  { k: 'emailCheckoutFollowup', label: 'Post Check-out Feedback Request', desc: 'Email requesting guest feedback after stay' },
                  { k: 'emailMaintenanceAlert', label: 'Maintenance Request Alerts', desc: 'Notify staff of new maintenance tickets via email' },
                ].map(item => (
                  <div key={item.k} className={`toggle-row ${notifications[item.k] ? 'on' : 'off'}`}>
                    <div className="toggle-info">
                      <strong>{item.label}</strong>
                      <small>{item.desc}</small>
                    </div>
                    <button
                      type="button"
                      className={`custom-toggle ${notifications[item.k] ? 'active' : ''}`}
                      onClick={() => toggleNotif(item.k)}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>
                ))}

                <h4 style={{ color: 'var(--primary)' }}>SMS / System Notifications</h4>
                {[
                  { k: 'smsLowInventory', label: 'Low Inventory Alert', desc: 'Alert manager when a room type drops below threshold' },
                  { k: 'smsUrgentMaintenance', label: 'Urgent Maintenance Alert', desc: 'SMS to managers for URGENT priority tickets' },
                  { k: 'autoAssignHousekeeping', label: 'Auto-assign Housekeeping Tasks', desc: 'Automatically assign cleaning tasks after check-out' },
                  { k: 'maintenanceNotifyAll', label: 'Notify All Managers on Maintenance', desc: 'Send maintenance alerts to ALL managers' },
                ].map(item => (
                  <div key={item.k} className={`toggle-row ${notifications[item.k] ? 'on' : 'off'}`}>
                    <div className="toggle-info">
                      <strong>{item.label}</strong>
                      <small>{item.desc}</small>
                    </div>
                    <button
                      type="button"
                      className={`custom-toggle ${notifications[item.k] ? 'active' : ''}`}
                      onClick={() => toggleNotif(item.k)}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card title="Security Settings" subtitle="Authentication, access control, and compliance options" icon={<FaShieldAlt />}>
              <div className="form-grid-2">
                <FormInput label="Session Timeout (minutes)" type="number" value={security.sessionTimeout} onChange={e => setSecurity({ ...security, sessionTimeout: Number(e.target.value) })} />
                <FormInput label="Minimum Password Length" type="number" value={security.passwordMinLength} onChange={e => setSecurity({ ...security, passwordMinLength: Number(e.target.value) })} />
                <FormInput label="Max Failed Login Attempts" type="number" value={security.loginAttemptsAllowed} onChange={e => setSecurity({ ...security, loginAttemptsAllowed: Number(e.target.value) })} />
                <FormInput label="IP Lockout Threshold (attempts)" type="number" value={security.ipLockoutThreshold} onChange={e => setSecurity({ ...security, ipLockoutThreshold: Number(e.target.value) })} />
              </div>

              <div className="notification-toggles" style={{ marginTop: '2rem' }}>
                {[
                  { k: 'requireStrongPassword', label: 'Require Strong Passwords', desc: 'Must include uppercase, lowercase, number, and special character' },
                  { k: 'twoFactorForAdmin', label: 'Force 2FA for Admins', desc: 'Admin and Manager roles must use two-factor authentication' },
                  { k: 'autoLogoutEnabled', label: 'Auto-logout on Inactivity', desc: 'Logout users after session timeout of inactivity' },
                ].map(item => (
                  <div key={item.k} className={`toggle-row ${security[item.k] ? 'on' : 'off'}`}>
                    <div className="toggle-info">
                      <strong>{item.label}</strong>
                      <small>{item.desc}</small>
                    </div>
                    <button
                      type="button"
                      className={`custom-toggle ${security[item.k] ? 'active' : ''}`}
                      onClick={() => toggleSec(item.k)}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                <h4 style={{ color: '#991b1b', marginTop: 0 }}><FaShieldAlt /> Privacy & GDPR Compliance</h4>
                <p style={{ color: '#7f1d1d', marginBottom: '1rem' }}>
                  The system is configured to handle data in compliance with GDPR and CCPA regulations.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Badge variant="success">GDPR Ready</Badge>
                  <Badge variant="success">CCPA Compliant</Badge>
                  <Badge variant="success">PCI-DSS</Badge>
                  <Badge variant="info">Data Encrypted at Rest</Badge>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'integrations' && (
            <Card title="System Integrations" subtitle="Connect third-party services and channels" icon={<FaPlug />}>
              <div className="integrations-list">
                {[
                  { name: 'Stripe Payments', status: 'connected', desc: 'Process credit card payments', category: 'Payments' },
                  { name: 'PayPal', status: 'disconnected', desc: 'Alternative payment processor', category: 'Payments' },
                  { name: 'Booking.com OTA', status: 'connected', desc: 'Sync bookings from Booking.com', category: 'Channels' },
                  { name: 'Airbnb Host API', status: 'disconnected', desc: 'Airbnb channel manager', category: 'Channels' },
                  { name: 'QuickBooks Online', status: 'connected', desc: 'Accounting and invoicing sync', category: 'Accounting' },
                  { name: 'Twilio SMS', status: 'connected', desc: 'Send SMS notifications', category: 'Communication' },
                ].map(int => (
                  <div key={int.name} className="integration-card">
                    <div className="int-info">
                      <div>
                        <h4 style={{ margin: 0 }}>{int.name}</h4>
                        <small style={{ color: '#6b7280' }}>{int.desc}</small>
                      </div>
                      <Badge variant="secondary">{int.category}</Badge>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <Badge variant={int.status === 'connected' ? 'success' : 'secondary'}>
                        {int.status === 'connected' ? 'Connected' : 'Disconnected'}
                      </Badge>
                      <Button size="sm" variant={int.status === 'connected' ? 'outline' : 'primary'} onClick={() => alert.info(`${int.name} is managed by your IT team.`)}>
                        {int.status === 'connected' ? 'Manage' : 'Connect'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
