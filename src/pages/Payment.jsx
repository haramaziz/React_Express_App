import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FaCreditCard,
  FaCheckCircle,
  FaFileInvoiceDollar,
  FaSignInAlt,
  FaMoneyBillWave
} from 'react-icons/fa';
import {
  Spinner,
  Button,
  Card,
  FormInput,
  FormSelect,
  Badge,
  formatCurrency,
  formatDate
} from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';

const BillingStatusBadge = ({ status }) => {
  const map = {
    paid: { variant: 'success', label: 'Paid' },
    open: { variant: 'danger', label: 'Open / Due' },
    partial: { variant: 'warning', label: 'Partial' },
    cancelled: { variant: 'secondary', label: 'Cancelled' },
    refunded: { variant: 'info', label: 'Refunded' }
  };
  const cfg = map[status] || { variant: 'default', label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

const Payment = () => {
  const alert = useAlert();
  const { isAuthenticated, isGuest, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState({
    invoiceId: '',
    method: 'credit_card',
    amount: ''
  });

  const canPay = isAuthenticated && isGuest();

  useEffect(() => {
    if (authLoading) return;
    if (canPay) loadInvoices();
    else setLoading(false);
  }, [authLoading, canPay]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await apiService.billing.getMine();
      const list = res.data?.data?.invoices || res.data?.invoices || [];
      setInvoices(list);
    } catch (err) {
      alert.handleApiError(err, 'Failed to load invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const unpaid = useMemo(
    () => invoices.filter((i) => ['open', 'partial', 'overdue'].includes(i.status) && (i.balanceDue || 0) > 0),
    [invoices]
  );

  const paid = useMemo(
    () => invoices.filter((i) => i.status === 'paid'),
    [invoices]
  );

  const selectedInvoice = unpaid.find((i) => i._id === form.invoiceId) || null;

  const selectInvoice = (id) => {
    const inv = unpaid.find((i) => i._id === id);
    setForm({
      ...form,
      invoiceId: id,
      amount: inv ? String(inv.balanceDue || 0) : ''
    });
    setSuccessMsg('');
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!form.invoiceId) {
      alert.error('Please select an invoice');
      return;
    }
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      alert.error('Enter a valid payment amount');
      return;
    }
    if (selectedInvoice && amount > Number(selectedInvoice.balanceDue || 0)) {
      alert.error('Amount cannot exceed the balance due');
      return;
    }
    try {
      setSubmitting(true);
      await apiService.billing.addPayment(form.invoiceId, {
        amount,
        method: form.method
      });
      setSuccessMsg(`Payment of ${formatCurrency(amount)} recorded successfully.`);
      alert.success('Payment successful');
      setForm({ invoiceId: '', method: 'credit_card', amount: '' });
      await loadInvoices();
    } catch (err) {
      alert.handleApiError(err, 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="loading-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!canPay) {
    return (
      <div className="public-section">
        <div className="section-header">
          <h1 className="section-title">Payments</h1>
          <p className="section-subtitle">Pay outstanding invoices for your stays</p>
        </div>
        <Card>
          <div className="empty-state">
            <FaSignInAlt className="empty-icon" />
            <p>Please sign in with a guest account to view and pay invoices.</p>
            <Link to="/login?redirect=/payment" className="btn btn-primary">
              <FaSignInAlt /> Sign In
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="payment-page public-section">
      <div className="section-header left">
        <div>
          <h1 className="section-title">Payments</h1>
          <p className="section-subtitle">Settle open invoices securely online</p>
        </div>
        <Link to="/my-bookings" className="btn btn-outline">
          <FaFileInvoiceDollar /> My Bookings
        </Link>
      </div>

      {successMsg && (
        <div style={{ borderLeft: '4px solid var(--success)', marginBottom: '1.5rem' }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)' }}>
              <FaCheckCircle />
              <strong>{successMsg}</strong>
            </div>
          </Card>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <Card title="Pay an Invoice" subtitle="Select an unpaid invoice and payment method" icon={<FaCreditCard />}>
          {unpaid.length === 0 ? (
            <div className="empty-state" style={{ padding: '1rem' }}>
              <FaCheckCircle className="empty-icon" style={{ color: 'var(--success)' }} />
              <p>You have no outstanding invoices.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {unpaid.map((inv) => (
                  <button
                    key={inv._id}
                    type="button"
                    onClick={() => selectInvoice(inv._id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      flexWrap: 'wrap',
                      padding: '0.9rem 1rem',
                      borderRadius: 12,
                      border: form.invoiceId === inv._id ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                      background: form.invoiceId === inv._id ? 'var(--primary-light)' : 'white',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <strong>{inv.invoiceNumber || inv._id?.slice(-6)}</strong>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Issued {formatDate(inv.createdAt || inv.issueDate)}
                        {inv.booking?.checkIn ? ` · Stay ${formatDate(inv.booking.checkIn, 'short')}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <BillingStatusBadge status={inv.status} />
                      <strong style={{ color: 'var(--danger)' }}>{formatCurrency(inv.balanceDue || 0)}</strong>
                    </div>
                  </button>
                ))}
              </div>

              <form onSubmit={handlePay} className="form-grid-2">
                <FormSelect
                  label="Invoice"
                  name="invoiceId"
                  required
                  value={form.invoiceId}
                  onChange={(e) => selectInvoice(e.target.value)}
                  options={unpaid.map((inv) => ({
                    value: inv._id,
                    label: `${inv.invoiceNumber || 'Invoice'} · Due ${formatCurrency(inv.balanceDue || 0)}`
                  }))}
                />
                <FormSelect
                  label="Payment Method"
                  name="method"
                  required
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  options={[
                    { value: 'credit_card', label: 'Credit Card' },
                    { value: 'debit_card', label: 'Debit Card' },
                    { value: 'online', label: 'Online Payment' }
                  ]}
                />
                <FormInput
                  label="Amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={submitting || !form.invoiceId}
                    icon={submitting ? <Spinner size="sm" /> : <FaMoneyBillWave />}
                  >
                    {submitting ? 'Processing...' : 'Pay Now'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </Card>

        <Card title="Paid Invoices" subtitle="Recently settled bills" icon={<FaCheckCircle />}>
          {paid.length === 0 ? (
            <p className="muted-center" style={{ margin: 0 }}>No paid invoices yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {paid.map((inv) => (
                <div
                  key={inv._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid var(--border-light)'
                  }}
                >
                  <div>
                    <strong>{inv.invoiceNumber || 'Invoice'}</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Paid {formatDate(inv.paidAt || inv.updatedAt || inv.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <BillingStatusBadge status="paid" />
                    <strong style={{ color: 'var(--success)' }}>
                      {formatCurrency(inv.totalAmount || inv.paidAmount || 0)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Payment;
