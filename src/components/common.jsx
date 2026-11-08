export const StatCard = ({ title, value, subtitle, icon, trend, color = 'primary' }) => {
  const trendUp = trend > 0;
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h3 className="stat-title">{title}</h3>
        <p className="stat-value">{value}</p>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
        {trend !== undefined && (
          <div className={`stat-trend ${trendUp ? 'up' : 'down'}`}>
            {trendUp ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
};

export const Modal = ({ isOpen, onClose, title, children, size = 'md', footer }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'modal-sm', md: 'modal-md', lg: 'modal-lg', xl: 'modal-xl' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${sizes[size]}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'badge-default',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    primary: 'badge-primary',
    secondary: 'badge-secondary'
  };
  return <span className={`badge ${variants[variant]}`}>{children}</span>;
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
  type = 'button',
  className = '',
  icon,
  fullWidth = false,
  ...props
}) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    danger: 'btn-danger',
    warning: 'btn-warning',
    info: 'btn-info',
    outline: 'btn-outline',
    ghost: 'btn-ghost'
  };
  const sizes = { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' };
  const widthClass = fullWidth ? 'btn-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variants[variant] || ''} ${sizes[size] || ''} ${widthClass} ${className}`.trim()}
      {...props}
    >
      {icon ? <span className="btn-icon">{icon}</span> : null}
      {children}
    </button>
  );
};

export const DataTable = ({ columns, data, actions, emptyMessage = 'No data available' }) => {
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{ width: col.width }}>
                {col.label}
              </th>
            ))}
            {actions && <th style={{ width: '150px' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="table-empty">
                {emptyMessage}
              </td>
            </tr>
          )}
          {data.map((row, idx) => (
            <tr key={row._id || idx} className="table-row">
              {columns.map(col => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
              {actions && (
                <td className="table-actions">
                  {actions.map(action => (
                    <button
                      key={action.label}
                      className={`action-btn action-${action.variant || 'default'}`}
                      onClick={() => action.onClick(row)}
                      disabled={action.disabled?.(row)}
                      title={action.label}
                    >
                      {action.icon || action.label}
                    </button>
                  ))}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const Card = ({ title, subtitle, children, actions, className = '' }) => {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
};

export const FormInput = ({ label, name, type = 'text', value, onChange, placeholder, required, error, disabled, ...props }) => {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="required">*</span>}
        </label>
      )}
      <input
        type={type}
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`form-input ${error ? 'has-error' : ''}`}
        {...props}
      />
      {error && <div className="form-error">{error}</div>}
    </div>
  );
};

export const FormSelect = ({ label, name, value, onChange, options, required, error, disabled, placeholder = 'Select...' }) => {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="required">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`form-select ${error ? 'has-error' : ''}`}
      >
        <option value="">{placeholder}</option>
        {options?.map(opt => (
          <option key={opt.value || opt} value={opt.value || opt}>
            {opt.label || opt}
          </option>
        ))}
      </select>
      {error && <div className="form-error">{error}</div>}
    </div>
  );
};

export const FormTextarea = ({ label, name, value, onChange, placeholder, required, error, disabled, rows = 4 }) => {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="required">*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={`form-textarea ${error ? 'has-error' : ''}`}
      />
      {error && <div className="form-error">{error}</div>}
    </div>
  );
};

export const Spinner = ({ size = 'md' }) => {
  const sizes = { sm: 'spinner-sm', md: 'spinner-md', lg: 'spinner-lg' };
  return <div className={`spinner-inline ${sizes[size]}`}></div>;
};

export const RoomStatusBadge = ({ status }) => {
  const map = {
    available: { variant: 'success', label: 'Available' },
    occupied: { variant: 'danger', label: 'Occupied' },
    cleaning: { variant: 'warning', label: 'Cleaning' },
    maintenance: { variant: 'secondary', label: 'Maintenance' },
    reserved: { variant: 'info', label: 'Reserved' }
  };
  const cfg = map[status] || { variant: 'default', label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

export const CleaningProgressBadge = ({ progress }) => {
  const map = {
    pending: { variant: 'warning', label: 'Pending' },
    in_progress: { variant: 'primary', label: 'In Progress' },
    cleaned: { variant: 'success', label: 'Cleaned' }
  };
  const cfg = map[progress] || { variant: 'secondary', label: progress || 'Pending' };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

export const BookingStatusBadge = ({ status }) => {
  const map = {
    pending: { variant: 'warning', label: 'Pending' },
    confirmed: { variant: 'info', label: 'Confirmed' },
    checked_in: { variant: 'primary', label: 'Checked In' },
    checked_out: { variant: 'success', label: 'Checked Out' },
    cancelled: { variant: 'danger', label: 'Cancelled' },
    no_show: { variant: 'secondary', label: 'No Show' }
  };
  const cfg = map[status] || { variant: 'default', label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(Number(amount) || 0);
};

export const formatDate = (date, format = 'medium') => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  if (format === 'short') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (format === 'full') {
    return d.toLocaleString('en-US');
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

import { useAlert as useAlertContext } from '../contexts/AlertContext';

export const StarRating = ({ rating, max = 5, size = 'sm' }) => {
  const sizeClass = size === 'lg' ? 'stars-lg' : size === 'md' ? 'stars-md' : 'stars-sm';
  return (
    <div className={`star-rating ${sizeClass}`}>
      {[...Array(max)].map((_, i) => (
        <span key={i} className={`star ${i < rating ? 'filled' : ''}`}>★</span>
      ))}
    </div>
  );
};
export const useAlert = () => useAlertContext();