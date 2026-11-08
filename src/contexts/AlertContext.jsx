import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import * as apiService from '../services/api';

const AlertContext = createContext();

const initialState = {
  alerts: []
};

let alertId = 0;

const alertReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ALERT':
      return {
        ...state,
        alerts: [...state.alerts, action.payload]
      };
    case 'REMOVE_ALERT':
      return {
        ...state,
        alerts: state.alerts.filter(a => a.id !== action.payload)
      };
    case 'CLEAR_ALERTS':
      return {
        ...state,
        alerts: []
      };
    default:
      return state;
  }
};

export const AlertProvider = ({ children }) => {
  const [state, dispatch] = useReducer(alertReducer, initialState);

  const removeAlert = useCallback((id) => {
    dispatch({ type: 'REMOVE_ALERT', payload: id });
  }, []);

  const showAlert = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++alertId;
    const payload = { id, message, type, duration };
    dispatch({ type: 'ADD_ALERT', payload });

    if (duration > 0) {
      setTimeout(() => removeAlert(id), duration);
    }

    return id;
  }, [removeAlert]);

  const success = useCallback((message, duration) => showAlert(message, 'success', duration), [showAlert]);
  const error = useCallback((message, duration) => showAlert(message, 'error', duration), [showAlert]);
  const warning = useCallback((message, duration) => showAlert(message, 'warning', duration), [showAlert]);
  const info = useCallback((message, duration) => showAlert(message, 'info', duration), [showAlert]);

  const handleApiError = useCallback((err, defaultMsg = 'An error occurred') => {
    const message = err?.response?.data?.message || err?.message || defaultMsg;
    error(message);
    return message;
  }, [error]);

  const value = {
    alerts: state.alerts,
    showAlert,
    removeAlert,
    success,
    error,
    warning,
    info,
    handleApiError,
    clearAll: () => dispatch({ type: 'CLEAR_ALERTS' })
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

export { apiService };
