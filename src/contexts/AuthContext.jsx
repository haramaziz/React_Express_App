import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import * as apiService from '../services/api';
import { useAlert } from './AlertContext';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('luxurystay_token'),
  isAuthenticated: false,
  loading: true
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
    case 'USER_LOADED':
      localStorage.setItem('luxurystay_token', action.payload.token || state.token);
      localStorage.setItem('luxurystay_user', JSON.stringify(action.payload.user));
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token || state.token,
        isAuthenticated: true,
        loading: false
      };
    case 'AUTH_ERROR':
    case 'LOGOUT':
      localStorage.removeItem('luxurystay_token');
      localStorage.removeItem('luxurystay_user');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false
      };
    case 'UPDATE_USER':
      localStorage.setItem('luxurystay_user', JSON.stringify(action.payload));
      return {
        ...state,
        user: action.payload
      };
    case 'STOP_LOADING':
      return { ...state, loading: false };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const alert = useAlert();

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('luxurystay_token');

    if (!token) {
      dispatch({ type: 'AUTH_ERROR' });
      return;
    }

    try {
      const res = await apiService.auth.getMe();
      dispatch({
        type: 'USER_LOADED',
        payload: { user: res.data.data.user, token }
      });
    } catch (err) {
      dispatch({ type: 'AUTH_ERROR' });
    }
  }, []);

  useEffect(() => {
    if (state.token) {
      loadUser();
    } else {
      dispatch({ type: 'STOP_LOADING' });
    }
  }, [state.token, loadUser]);

  const login = useCallback(async (email, password) => {
    try {
      const res = await apiService.auth.login(email, password);
      const { token, data } = res.data;
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { token, user: data.user }
      });
      alert.success(`Welcome back, ${data.user.name}!`);
      return true;
    } catch (err) {
      alert.handleApiError(err, 'Login failed');
      return false;
    }
  }, [alert]);

  const logout = useCallback(async () => {
    try {
      await apiService.auth.logout();
    } catch (e) {
      // ignore
    }
    dispatch({ type: 'LOGOUT' });
    alert.info('You have been logged out');
  }, [alert]);

  const updateProfile = useCallback(async (data) => {
    try {
      const res = await apiService.auth.updateProfile(data);
      dispatch({ type: 'UPDATE_USER', payload: res.data.data.user });
      alert.success('Profile updated successfully');
      return true;
    } catch (err) {
      alert.handleApiError(err, 'Failed to update profile');
      return false;
    }
  }, [alert]);

  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      await apiService.auth.updatePassword({ currentPassword, newPassword });
      alert.success('Password updated successfully');
      return true;
    } catch (err) {
      alert.handleApiError(err, 'Failed to update password');
      return false;
    }
  }, [alert]);

  const updateAvatar = useCallback(async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await apiService.auth.updateAvatar(formData);
      dispatch({ type: 'UPDATE_USER', payload: res.data.data.user });
      alert.success('Profile photo updated');
      return true;
    } catch (err) {
      alert.handleApiError(err, 'Failed to upload photo');
      return false;
    }
  }, [alert]);

  const hasRole = useCallback((...roles) => {
    if (!state.user) return false;
    return roles.includes(state.user.role);
  }, [state.user]);

  const isGuest = useCallback(() => {
    return state.user?.role === 'guest';
  }, [state.user]);

  const isStaff = useCallback(() => {
    if (!state.user) return false;
    return ['admin', 'manager', 'receptionist', 'housekeeping'].includes(state.user.role);
  }, [state.user]);

  const getDefaultRoute = useCallback(() => {
    if (!state.user) return '/login';
    if (state.user.role === 'guest') return '/';
    return '/dashboard';
  }, [state.user]);

  const value = {
    ...state,
    login,
    logout,
    loadUser,
    updateProfile,
    updatePassword,
    updateAvatar,
    hasRole,
    isGuest,
    isStaff,
    getDefaultRoute
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
