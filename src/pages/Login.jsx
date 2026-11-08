import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FaSignInAlt, FaEnvelope, FaLock, FaHotel, FaUserPlus, FaUser, FaPhone } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { Spinner, Button } from '../components/common';
import * as apiService from '../services/api';

const Login = () => {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, user, getDefaultRoute } = useAuth();
  const alert = useAlert();
  const navigate = useNavigate();
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);
  const redirectParam = urlParams.get('redirect');
  const from = location.state?.from?.pathname || redirectParam;

  useEffect(() => {
    if (location.pathname === '/register') {
      setMode('register');
    } else if (location.pathname === '/login') {
      setMode('login');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isAuthenticated) {
      // Guests always land on public home unless a safe public redirect was requested
      let target = getDefaultRoute();
      if (user?.role === 'guest') {
        const safeRedirect = from && !from.startsWith('/dashboard') && !from.startsWith('/guest')
          && !['/login', '/register'].includes(from)
          ? from
          : '/';
        target = safeRedirect;
      } else if (from && !from.startsWith('/guest') && from !== '/') {
        target = from;
      }
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, from, navigate, getDefaultRoute]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setForm({ email: '', password: '', name: '', phone: '', confirmPassword: '' });
    navigate(newMode === 'register' ? '/register' : '/login', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'register') {
      if (form.password !== form.confirmPassword) {
        alert.error('Passwords do not match');
        setLoading(false);
        return;
      }
      if ((form.password || '').length < 6) {
        alert.error('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      try {
        // Do NOT store JWT or auto-login — require explicit sign-in
        await apiService.auth.register({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          role: 'guest'
        });

        localStorage.removeItem('luxurystay_token');
        localStorage.removeItem('luxurystay_user');

        alert.success('Registration successful! Please sign in to continue.');
        setMode('login');
        setForm({ email: form.email, password: '', name: '', phone: '', confirmPassword: '' });
        navigate('/login', { replace: true });
      } catch (err) {
        alert.handleApiError(err, 'Registration failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      await login(form.email, form.password);
    } catch (err) {
      alert.handleApiError(err, 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="bg-overlay"></div>
      </div>

      <div className="login-container">
        <div className="login-brand">
          <div className="brand-logo-wrap">
            <FaHotel className="brand-logo" />
          </div>
          <h1 className="brand-heading">LuxuryStay</h1>
          <p className="brand-tagline">Hotel Management System</p>
        </div>

        <div className="login-card">
          <div className="auth-tabs">
            <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => switchMode('login')} type="button">
              <FaSignInAlt /> Sign In
            </button>
            <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => switchMode('register')} type="button">
              <FaUserPlus /> Register
            </button>
          </div>

          <h2 className="login-title">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="login-subtitle">
            {mode === 'login' ? 'Sign in to continue your LuxuryStay experience' : 'Join LuxuryStay to book your perfect stay'}
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-icon-wrap">
                  <FaUser className="input-icon" />
                  <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" required className="form-input with-icon" autoComplete="name" />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-icon-wrap">
                <FaEnvelope className="input-icon" />
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder={mode === 'login' ? 'you@example.com' : 'you@example.com'} required className="form-input with-icon" autoComplete="email" />
              </div>
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div className="input-icon-wrap">
                  <FaPhone className="input-icon" />
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+1 555 0123" required className="form-input with-icon" autoComplete="tel" />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-icon-wrap">
                <FaLock className="input-icon" />
                <input type="password" name="password" value={form.password} onChange={handleChange} placeholder={mode === 'login' ? 'Enter your password' : 'Min. 6 characters'} required className="form-input with-icon" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </div>
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="input-icon-wrap">
                  <FaLock className="input-icon" />
                  <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Re-enter your password" required className="form-input with-icon" autoComplete="new-password" />
                </div>
              </div>
            )}

            <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              {mode === 'login' ? (
                <>Don&apos;t have an account? <Link to="/register">Register as Guest</Link></>
              ) : (
                <>Already have an account? <Link to="/login">Sign In</Link></>
              )}
            </p>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="login-btn"
              disabled={loading}
              icon={loading ? <Spinner size="sm" /> : (mode === 'login' ? <FaSignInAlt /> : <FaUserPlus />)}
            >
              {loading
                ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </Button>

            <p style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link to="/">← Back to LuxuryStay</Link>
            </p>
          </form>
        </div>

        <p className="login-footer">© {new Date().getFullYear()} LuxuryStay Hospitality. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Login;
