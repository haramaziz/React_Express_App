import { useState, useEffect } from 'react';
import {
  FaFileInvoiceDollar,
  FaFileAlt,
  FaMoneyBillWave,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaChevronDown,
  FaChevronUp,
  FaReceipt
} from 'react-icons/fa';
import {
  StatCard,
  Card,
  Badge,
  formatCurrency,
  formatDate,
  Spinner,
  DataTable
} from '../components/common';
import * as apiService from '../services/api';
import { useAlert } from '../contexts/AlertContext';

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

const GuestBilling = () => {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await apiService.billing.getMine();
      setInvoices(res.data?.data?.invoices || res.data?.invoices || []);
      setFinancials(res.data?.financials || {
        totalInvoiced: res.data?.totalInvoiced || 0,
        totalPaid: res.data?.totalPaid || 0,
        totalOutstanding: res.data?.totalOutstanding || 0
      });
    } catch (err) {
      alert.handleApiError(err, 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(i => {
    if (filter === 'all') return true;
    if (filter === 'unpaid') return ['open', 'partial'].includes(i.status);
    if (filter === 'paid') return i.status === 'paid';
    return true;
  });

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  if (loading) {
    return (
      <div className="loading-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="guest-billing">
      <div className="stats-grid">
        <StatCard
          title="Total Invoiced"
          value={formatCurrency(financials?.totalInvoiced || 0)}
          subtitle={`${invoices.length} invoice(s)`}
          icon={<FaFileInvoiceDollar />}
          color="primary"
        />
        <StatCard
          title="Amount Paid"
          value={formatCurrency(financials?.totalPaid || 0)}
          subtitle={financials?.totalInvoiced > 0
            ? `${Math.round(((financials.totalPaid || 0) / financials.totalInvoiced) * 100)}% paid`
            : '0% paid'}
          icon={<FaMoneyBillWave />}
          color="success"
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(financials?.totalOutstanding || 0)}
          subtitle="Due for payment"
          icon={<FaReceipt />}
          color={(financials?.totalOutstanding || 0) > 0 ? 'danger' : 'info'}
        />
      </div>

      {(financials?.totalOutstanding || 0) > 0 && (
        <Card className="mt-4" style={{ borderLeft: '4px solid var(--danger)', background: 'rgba(239,68,68,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <FaExclamationTriangle style={{ fontSize: '1.5rem', color: 'var(--danger)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: 'var(--danger)' }}>
                Outstanding Balance of {formatCurrency(financials.totalOutstanding)}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                Please settle the due amount at the front desk during your stay or contact reception for payment options.
                All payments are securely handled at check-in or check-out.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="mt-4" title="My Invoices" subtitle={`${filteredInvoices.length} of ${invoices.length} invoice(s) shown`}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'paid', label: 'Paid' },
            { key: 'unpaid', label: 'Outstanding' }
          ].map(tab => (
            <button
              key={tab.key}
              className={`booking-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="empty-state">
            <FaFileAlt className="empty-icon" />
            <p style={{ marginBottom: '0.25rem' }}>
              {filter === 'all' ? 'No invoices yet.' : `No ${filter} invoices.`}
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Your invoice will appear here after a booking is confirmed.
            </p>
          </div>
        ) : (
          <div className="invoice-list">
            {filteredInvoices.map(invoice => (
              <div
                key={invoice._id}
                className={`invoice-card ${invoice.status === 'open' || invoice.status === 'partial' ? 'has-outstanding' : ''}`}
              >
                <div
                  className="invoice-header"
                  onClick={() => toggleExpand(invoice._id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="invoice-header-left">
                    <div className="invoice-icon-wrap">
                      <FaFileInvoiceDollar />
                    </div>
                    <div>
                      <div className="invoice-number">
                        Invoice #{invoice.invoiceNumber || invoice._id?.toString().slice(-8).toUpperCase()}
                      </div>
                      <div className="invoice-meta">
                        <span>Issued: {formatDate(invoice.createdAt)}</span>
                        {invoice.booking?.bookingReference && (
                          <span>• Booking: {invoice.booking.bookingReference}</span>
                        )}
                        {invoice.paidAt && (
                          <span>• Paid: {formatDate(invoice.paidAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="invoice-header-right">
                    <div className="invoice-amount">
                      <div className="invoice-total">{formatCurrency(invoice.totalAmount || invoice.subTotal || 0)}</div>
                      <BillingStatusBadge status={invoice.status} />
                    </div>
                    <button className="invoice-expand-btn" onClick={e => { e.stopPropagation(); toggleExpand(invoice._id); }}>
                      {expandedId === invoice._id ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                  </div>
                </div>

                {expandedId === invoice._id && (
                  <div className="invoice-details">
                    <div className="invoice-section">
                      <h5 className="invoice-section-title">Charges</h5>
                      {(invoice.charges && invoice.charges.length > 0) ? (
                        <table className="charges-table">
                          <thead>
                            <tr>
                              <th>Description</th>
                              <th style={{ textAlign: 'right' }}>Qty</th>
                              <th style={{ textAlign: 'right' }}>Unit</th>
                              <th style={{ textAlign: 'right' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoice.charges.map((c, idx) => (
                              <tr key={c._id || idx}>
                                <td>
                                  <div><strong>{c.description || c.category || 'Charge'}</strong></div>
                                  {c.notes && <small style={{ color: 'var(--text-secondary)' }}>{c.notes}</small>}
                                </td>
                                <td style={{ textAlign: 'right' }}>{c.quantity || 1}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(c.unitPrice || (c.amount / (c.quantity || 1)))}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(c.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          Booking charge — Room {invoice.booking?.roomNumber || 'N/A'}
                          ({invoice.booking ? formatDate(invoice.booking.checkIn, 'short') : '?'} → {invoice.booking ? formatDate(invoice.booking.checkOut, 'short') : '?'})
                        </p>
                      )}
                    </div>

                    <div className="invoice-section invoice-totals-section">
                      <div className="billing-row"><span>Subtotal</span><span>{formatCurrency(invoice.subTotal || 0)}</span></div>
                      {(invoice.discountAmount || 0) > 0 && (
                        <div className="billing-row"><span>Discount</span><span style={{ color: 'var(--success)' }}>-{formatCurrency(invoice.discountAmount)}</span></div>
                      )}
                      <div className="billing-row">
                        <span>Tax ({invoice.taxRate || 10}%)</span>
                        <span>{formatCurrency(invoice.taxAmount || 0)}</span>
                      </div>
                      <div className="billing-row balance">
                        <span><strong>Total</strong></span>
                        <strong>{formatCurrency(invoice.totalAmount || 0)}</strong>
                      </div>
                      <div className="billing-row"><span>Paid to Date</span><span style={{ color: 'var(--success)' }}>{formatCurrency(invoice.paidAmount || 0)}</span></div>
                      <div className="billing-row balance" style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.75rem' }}>
                        <span><strong>Balance Due</strong></span>
                        <strong style={{ color: (invoice.balanceDue || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {formatCurrency(invoice.balanceDue || 0)}
                        </strong>
                      </div>
                    </div>

                    {invoice.payments && invoice.payments.length > 0 && (
                      <div className="invoice-section">
                        <h5 className="invoice-section-title">
                          <FaCheckCircle style={{ color: 'var(--success)', marginRight: '0.5rem' }} />
                          Payment History
                        </h5>
                        <table className="charges-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Method</th>
                              <th>Reference</th>
                              <th style={{ textAlign: 'right' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoice.payments.map((p, idx) => (
                              <tr key={p._id || idx}>
                                <td>{formatDate(p.date || p.receivedAt || invoice.paidAt || invoice.createdAt)}</td>
                                <td style={{ textTransform: 'capitalize' }}>{p.method || 'cash'}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.transactionId || '-'}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(p.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {invoice.notes && (
                      <div className="invoice-section">
                        <h5 className="invoice-section-title">Notes</h5>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>{invoice.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default GuestBilling;
