import { useAlert } from '../contexts/AlertContext';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const AlertContainer = () => {
  const { alerts, removeAlert } = useAlert();

  const icons = {
    success: <FaCheckCircle className="alert-icon success" />,
    error: <FaTimesCircle className="alert-icon error" />,
    warning: <FaExclamationTriangle className="alert-icon warning" />,
    info: <FaInfoCircle className="alert-icon info" />
  };

  return (
    <div className="alert-container">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`alert alert-${alert.type}`}
          role="alert"
        >
          <div className="alert-content">
            {icons[alert.type]}
            <span className="alert-message">{alert.message}</span>
          </div>
          <button
            className="alert-close"
            onClick={() => removeAlert(alert.id)}
            aria-label="Close alert"
          >
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AlertContainer;
