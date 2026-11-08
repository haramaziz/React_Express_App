import { Link } from 'react-router-dom';
import { FaHome, FaHotel } from 'react-icons/fa';

const NotFound = () => {
  return (
    <div className="notfound-page">
      <div className="notfound-content">
        <FaHotel className="nf-icon" />
        <h1 className="nf-code">404</h1>
        <h2 className="nf-title">Page Not Found</h2>
        <p className="nf-subtitle">
          The page you're looking for doesn't exist or has been moved.
          Head back to the dashboard to continue managing LuxuryStay operations.
        </p>
        <Link to="/dashboard" className="nf-cta">
          <FaHome style={{ marginRight: '8px' }} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
