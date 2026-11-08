import { useState, useEffect } from 'react';
import {
  FaPlus, FaFileInvoiceDollar, FaEye, FaMoneyBillWave, FaCartPlus, FaFileExport
} from 'react-icons/fa';
import {
  Card, Button, DataTable, Modal, FormInput, FormSelect, FormTextarea,
  Badge, Spinner, formatCurrency, formatDate
} from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';

const Billing = () => {
  const alert = useAlert();
  const [invoices, setInvoices] = useState([]);
  const [financials, setFinancials] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '' });
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewInv, setViewInv] = useState(null);
  const [showCharge, setShowCharge] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeInv, setActiveInv] = useState(null);

  const [form, setForm] = useState({
    booking: '', charges: [{ description: '', category: 'room', quantity: 1, unitPrice: '' }],
    payments: [], taxRate: 10, discountAmount: 0, notes: ''
  });
  const [chargeForm, setChargeForm] = useState({ description: '', category: 'other', quantity: 1, unitPrice: '', notes: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'credit_card', transactionId: '', notes: '' });
  const [availableBookings, setAvailableBookings] = useState([]);

  useEffect(() => { loadData(); }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      const [invRes, sumRes] = await Promise.all([
        apiService.billing.getAll(params),
        apiService.billing.getSummary()
      ]);
      setInvoices(invRes.data.data.invoices);
      setFinancials(invRes.data.financials || {});
      setSummary(sumRes.data.data);
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = async () => {
    try {
      const res = await apiService.bookings.getAll({});
      setAvailableBookings(res.data.data.bookings.filter(b => !['cancelled', 'no_show'].includes(b.status)));
    } catch (e) { /* silent */ }
    setForm({
      booking: '', charges: [{ description: '', category: 'room', quantity: 1, unitPrice: '' }],
      payments: [], taxRate: 10, discountAmount: 0, notes: ''
    });
    setShowModal(true);
  };

  const computeTotals = (charges, taxRate, discountAmount) => {
    const sub = charges.reduce((s, c) => s + ((Number(c.quantity) || 0) * (Number(c.unitPrice) || 0)), 0);
    const tax = sub * ((Number(taxRate) || 10) / 100);
    const disc = Number(discountAmount) || 0;
    const total = sub + tax - disc;
    const paid = form.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return { subTotal: sub, tax, total, paid, balance: total - paid };
  };

  const totals = computeTotals(form.charges, form.taxRate, form.discountAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.booking) { alert.error('Please select a booking'); return; }
    const validCharges = form.charges.filter(c => c.description && c.unitPrice);
    if (validCharges.length === 0) { alert.error('Add at least one charge'); return; }

    try {
      setSubmitting(true);
      await apiService.billing.create({
        booking: form.booking,
        charges: validCharges.map(c => ({ ...c, quantity: Number(c.quantity), unitPrice: Number(c.unitPrice), amount: Number(c.quantity) * Number(c.unitPrice) })),
        payments: form.payments.map(p => ({ ...p, amount: Number(p.amount) })),
        taxRate: Number(form.taxRate),
        discountAmount: Number(form.discountAmount),
        notes: form.notes
      });
      alert.success('Invoice created');
      setShowModal(false);
      loadData();
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = async (inv) => {
    try {
      const res = await apiService.billing.getById(inv._id);
      setViewInv(res.data.data.invoice);
      setShowView(true);
    } catch (e) {
      alert.handleApiError(e);
    }
  };

  const openCharge = (inv) => {
    setActiveInv(inv);
    setChargeForm({ description: '', category: 'other', quantity: 1, unitPrice: '', notes: '' });
    setShowCharge(true);
  };

  const submitCharge = async () => {
    if (!chargeForm.description || !chargeForm.unitPrice) {
      alert.error('Description and price required');
      return;
    }
    try {
      setSubmitting(true);
      await apiService.billing.addCharge(activeInv._id, {
        ...chargeForm,
        quantity: Number(chargeForm.quantity),
        unitPrice: Number(chargeForm.unitPrice)
      });
      alert.success('Charge added');
      setShowCharge(false);
      loadData();
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const openPayment = (inv) => {
    setActiveInv(inv);
    setPaymentForm({ amount: (inv.balanceDue || (inv.totalAmount - inv.paidAmount)).toString(), method: 'credit_card', transactionId: '', notes: '' });
    setShowPayment(true);
  };

  const submitPayment = async () => {
    if (!paymentForm.amount) { alert.error('Enter payment amount'); return; }
    try {
      setSubmitting(true);
      await apiService.billing.addPayment(activeInv._id, {
        ...paymentForm,
        amount: Number(paymentForm.amount)
      });
      alert.success('Payment recorded');
      setShowPayment(false);
      loadData();
    } catch (e) {
      alert.handleApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const addChargeRow = () => {
    setForm({ ...form, charges: [...form.charges, { description: '', category: 'other', quantity: 1, unitPrice: '' }] });
  };

  const updateCharge = (idx, field, value) => {
    const charges = [...form.charges];
    charges[idx][field] = value;
    setForm({ ...form, charges });
  };

  const removeCharge = (idx) => {
    setForm({ ...form, charges: form.charges.filter((_, i) => i !== idx) });
  };

  const statusBadge = (s) => {
    const map = {
      draft: <Badge variant="secondary">Draft</Badge>,
      open: <Badge variant="warning">Open</Badge>,
      partial: <Badge variant="info">Partial</Badge>,
      paid: <Badge variant="success">Paid</Badge>,
      overdue: <Badge variant="danger">Overdue</Badge>,
      cancelled: <Badge variant="secondary">Cancelled</Badge>
    };
    return map[s] || <Badge>{s}</Badge>;
  };

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice #', render: v => <strong style={{ color: '#6366f1' }}>{v}</strong> },
    {
      key: 'guest',
      label: 'Guest',
      render: v => v ? `${v.firstName} ${v.lastName}` : '-'
    },
    { key: 'booking', label: 'Booking Ref', render: v => v?.bookingReference || '-' },
    {
      key: 'totalAmount',
      label: 'Total',
      render: v => <strong>{formatCurrency(v)}</strong>
    },
    {
      key: 'paidAmount',
      label: 'Paid',
      render: (v, r) => (
        <div>
          <div style={{ color: '#10b981' }}>{formatCurrency(v)}</div>
          {r.balanceDue > 0 && <small style={{ color: '#ef4444' }}>Owed: {formatCurrency(r.balanceDue)}</small>}
        </div>
      )
    },
    { key: 'status', label: 'Status', render: v => statusBadge(v) },
    { key: 'issueDate', label: 'Date', render: v => formatDate(v) }
  ];

  const actions = [
    { label: 'View', icon: <FaEye />, variant: 'default', onClick: handleView },
    { label: 'Add Charge', icon: <FaCartPlus />, variant: 'warning', onClick: openCharge },
    { label: 'Payment', icon: <FaMoneyBillWave />, variant: 'success', onClick: openPayment, disabled: r => ['paid', 'cancelled'].includes(r.status) }
  ];

  return (
    <div className="billing-page">
      <div className="fin-stats">
        <Card className="fin-card">
          <div className="fin-card-inner">
            <span className="fin-label">Total Invoiced</span>
            <span className="fin-value primary">{formatCurrency(financials.totalInvoiced)}</span>
          </div>
        </Card>
        <Card className="fin-card">
          <div className="fin-card-inner">
            <span className="fin-label">Total Paid</span>
            <span className="fin-value success">{formatCurrency(financials.totalPaid)}</span>
          </div>
        </Card>
        <Card className="fin-card">
          <div className="fin-card-inner">
            <span className="fin-label">Outstanding</span>
            <span className="fin-value warning">{formatCurrency(financials.totalOutstanding)}</span>
          </div>
        </Card>
        <Card className="fin-card">
          <div className="fin-card-inner">
            <span className="fin-label">Revenue (Today)</span>
            <span className="fin-value info">{formatCurrency(summary?.today || 0)}</span>
          </div>
        </Card>
      </div>

      <Card
        title="Invoices"
        subtitle="All billing transactions and invoices"
        actions={
          <>
            <Button variant="outline" icon={<FaFileExport />}>Export</Button>
            <Button variant="primary" icon={<FaPlus />} onClick={openCreate}>New Invoice</Button>
          </>
        }
      >
        <div className="filter-bar">
          <FormSelect
            placeholder="All Status"
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
            options={['draft', 'open', 'partial', 'paid', 'overdue', 'cancelled']}
          />
        </div>

        {loading ? <div className="loading-center"><Spinner /></div> : (
          <DataTable columns={columns} data={invoices} actions={actions} emptyMessage="No invoices" />
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Invoice"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Create Invoice'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <FormSelect
              label="Select Booking"
              value={form.booking}
              onChange={e => setForm({ ...form, booking: e.target.value })}
              required
              options={availableBookings.map(b => ({
                value: b._id,
                label: `${b.bookingReference} - ${b.guest?.firstName || ''} ${b.guest?.lastName || ''} (${formatCurrency(b.totalAmount)})`
              }))}
            />
            <div></div>
          </div>

          <h4 style={{ margin: '1.5rem 0 1rem', color: '#6366f1' }}>Charges</h4>
          {form.charges.map((c, idx) => (
            <div key={idx} className="charge-row">
              <FormInput
                placeholder="Description"
                value={c.description}
                onChange={e => updateCharge(idx, 'description', e.target.value)}
              />
              <FormSelect
                value={c.category}
                onChange={e => updateCharge(idx, 'category', e.target.value)}
                options={['room', 'food', 'laundry', 'spa', 'transport', 'minibar', 'other']}
              />
              <FormInput
                type="number"
                placeholder="Qty"
                value={c.quantity}
                onChange={e => updateCharge(idx, 'quantity', e.target.value)}
                style={{ maxWidth: '100px' }}
              />
              <FormInput
                type="number"
                placeholder="Unit $"
                value={c.unitPrice}
                onChange={e => updateCharge(idx, 'unitPrice', e.target.value)}
                style={{ maxWidth: '140px' }}
              />
              <div className="charge-total">
                {formatCurrency((Number(c.quantity) || 0) * (Number(c.unitPrice) || 0))}
              </div>
              <button type="button" className="btn-remove" onClick={() => removeCharge(idx)} disabled={form.charges.length === 1}>×</button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addChargeRow}>+ Add Charge</Button>

          <div className="form-grid-2" style={{ marginTop: '2rem' }}>
            <FormInput label="Tax Rate (%)" type="number" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })} />
            <FormInput label="Discount ($)" type="number" value={form.discountAmount} onChange={e => setForm({ ...form, discountAmount: e.target.value })} />
          </div>

          <div className="booking-summary" style={{ marginTop: '2rem' }}>
            <div className="summary-row"><span>Subtotal</span><span>{formatCurrency(totals.subTotal)}</span></div>
            <div className="summary-row"><span>Tax ({form.taxRate}%)</span><span>{formatCurrency(totals.tax)}</span></div>
            <div className="summary-row"><span>Discount</span><span>-{formatCurrency(totals.discount)}</span></div>
            <div className="summary-row total"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
          </div>

          <FormTextarea label="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </form>
      </Modal>

      <Modal
        isOpen={showView}
        onClose={() => setShowView(false)}
        title={`Invoice ${viewInv?.invoiceNumber}`}
        size="lg"
      >
        {viewInv && (
          <div className="invoice-details">
            <div className="invoice-header">
              <div>
                <h1 style={{ color: '#6366f1', margin: 0 }}>INVOICE</h1>
                <h3 style={{ margin: '4px 0' }}>{viewInv.invoiceNumber}</h3>
                <p style={{ color: '#6b7280' }}>Issued: {formatDate(viewInv.issueDate, 'full')}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {statusBadge(viewInv.status)}
                <p style={{ marginTop: '0.5rem' }}>Booking: {viewInv.booking?.bookingReference}</p>
              </div>
            </div>

            <div className="invoice-from-to">
              <div>
                <h4>From</h4>
                <p><strong>LuxuryStay Hospitality</strong></p>
                <p>123 Luxury Ave, Suite 100</p>
                <p>Email: billing@luxurystay.com</p>
              </div>
              <div>
                <h4>Bill To</h4>
                <p><strong>{viewInv.guest?.firstName} {viewInv.guest?.lastName}</strong></p>
                <p>{viewInv.guest?.phone}</p>
                <p>{viewInv.guest?.email || ''}</p>
                {viewInv.guest?.address?.city && (
                  <p>{viewInv.guest.address.city}, {viewInv.guest.address.country}</p>
                )}
              </div>
            </div>

            <h4 style={{ marginTop: '2rem' }}>Charges</h4>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Description</th><th>Category</th><th>Qty</th><th>Unit</th><th className="text-right">Amount</th></tr>
                </thead>
                <tbody>
                  {viewInv.charges?.map((c, i) => (
                    <tr key={i}>
                      <td>{c.description}</td>
                      <td><Badge variant="secondary">{c.category}</Badge></td>
                      <td>{c.quantity}</td>
                      <td>{formatCurrency(c.unitPrice)}</td>
                      <td className="text-right">{formatCurrency(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="invoice-totals">
              <div className="summary-row"><span>Subtotal</span><span>{formatCurrency(viewInv.subTotal)}</span></div>
              <div className="summary-row"><span>Tax ({viewInv.taxRate}%)</span><span>{formatCurrency(viewInv.taxAmount)}</span></div>
              <div className="summary-row"><span>Discount</span><span>-{formatCurrency(viewInv.discountAmount)}</span></div>
              <div className="summary-row total"><span>Total</span><span>{formatCurrency(viewInv.totalAmount)}</span></div>
              <div className="summary-row"><span>Amount Paid</span><span style={{ color: '#10b981' }}>{formatCurrency(viewInv.paidAmount)}</span></div>
              <div className="summary-row total"><span>Balance Due</span><span style={{ color: viewInv.balanceDue > 0 ? '#ef4444' : '#10b981' }}>{formatCurrency(viewInv.balanceDue)}</span></div>
            </div>

            {viewInv.payments?.length > 0 && (
              <>
                <h4 style={{ marginTop: '2rem' }}>Payment History</h4>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>Date</th><th>Method</th><th>Transaction #</th><th className="text-right">Amount</th></tr></thead>
                    <tbody>
                      {viewInv.payments.map((p, i) => (
                        <tr key={i}>
                          <td>{formatDate(p.date, 'full')}</td>
                          <td>{p.method?.replace('_', ' ')}</td>
                          <td>{p.transactionId || '-'}</td>
                          <td className="text-right">{formatCurrency(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <Button variant="success" icon={<FaMoneyBillWave />} onClick={() => { setShowView(false); openPayment(viewInv); }}>
                Record Payment
              </Button>
              <Button variant="warning" icon={<FaCartPlus />} onClick={() => { setShowView(false); openCharge(viewInv); }}>
                Add Charge
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showCharge}
        onClose={() => setShowCharge(false)}
        title="Add Charge to Invoice"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCharge(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitCharge} disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Add Charge'}
            </Button>
          </>
        }
      >
        <div className="form-grid-2">
          <FormInput label="Description" value={chargeForm.description} onChange={e => setChargeForm({ ...chargeForm, description: e.target.value })} required />
          <FormSelect label="Category" value={chargeForm.category} onChange={e => setChargeForm({ ...chargeForm, category: e.target.value })} options={['room', 'food', 'laundry', 'spa', 'transport', 'minibar', 'other']} />
          <FormInput label="Quantity" type="number" value={chargeForm.quantity} onChange={e => setChargeForm({ ...chargeForm, quantity: e.target.value })} />
          <FormInput label="Unit Price ($)" type="number" value={chargeForm.unitPrice} onChange={e => setChargeForm({ ...chargeForm, unitPrice: e.target.value })} required />
          <div className="form-grid-span-2">
            <FormTextarea label="Notes" value={chargeForm.notes} onChange={e => setChargeForm({ ...chargeForm, notes: e.target.value })} />
          </div>
          <div className="form-grid-span-2">
            <div className="booking-summary">
              <div className="summary-row total">
                <span>Charge Total</span>
                <span>{formatCurrency((Number(chargeForm.quantity) || 0) * (Number(chargeForm.unitPrice) || 0))}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        title="Record Payment"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitPayment} disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Record Payment'}
            </Button>
          </>
        }
      >
        <div className="form-grid-2">
          <FormInput label="Amount ($)" type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
          <FormSelect label="Payment Method" value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })} options={['cash', 'credit_card', 'debit_card', 'bank_transfer', 'online', 'check']} />
          <div className="form-grid-span-2">
            <FormInput label="Transaction ID / Reference" value={paymentForm.transactionId} onChange={e => setPaymentForm({ ...paymentForm, transactionId: e.target.value })} />
          </div>
          <div className="form-grid-span-2">
            <FormTextarea label="Notes" value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Billing;
