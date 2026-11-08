import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AlertProvider } from './contexts/AlertContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import PublicLayout from './components/PublicLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Bookings from './pages/Bookings';
import Guests from './pages/Guests';
import Billing from './pages/Billing';
import Maintenance from './pages/Maintenance';
import Feedback from './pages/Feedback';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import PublicHome from './pages/PublicHome';
import PublicRooms from './pages/PublicRooms';
import RoomDetail from './pages/RoomDetail';
import MyBookings from './pages/MyBookings';
import About from './pages/About';
import BookingPage from './pages/BookingPage';
import PublicFeedback from './pages/PublicFeedback';
import Payment from './pages/Payment';
import Contact from './pages/Contact';

function App() {
  return (
    <BrowserRouter>
      <AlertProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login />} />

            {/* Public hotel frontend */}
            <Route element={<PublicLayout />}>
              <Route index element={<PublicHome />} />
              <Route path="about" element={<About />} />
              <Route path="rooms" element={<PublicRooms />} />
              <Route path="rooms/:id" element={<RoomDetail />} />
              <Route path="booking" element={<BookingPage />} />
              <Route path="feedback" element={<PublicFeedback />} />
              <Route path="payment" element={<Payment />} />
              <Route path="contact" element={<Contact />} />
              <Route
                path="my-bookings"
                element={
                  <ProtectedRoute roles={['guest']}>
                    <MyBookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="profile"
                element={
                  <ProtectedRoute roles={['guest']}>
                    <Profile />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Legacy guest portal redirects */}
            <Route path="/guest" element={<Navigate to="/" replace />} />
            <Route path="/guest/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/guest/bookings" element={<Navigate to="/my-bookings" replace />} />
            <Route path="/guest/profile" element={<Navigate to="/profile" replace />} />
            <Route path="/guest/*" element={<Navigate to="/" replace />} />
            <Route path="/home" element={<Navigate to="/" replace />} />

            {/* Staff / admin HMS */}
            <Route
              element={
                <ProtectedRoute roles={['admin', 'manager', 'receptionist', 'housekeeping']}>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="room-management" element={<Rooms />} />
              <Route
                path="bookings"
                element={
                  <ProtectedRoute roles={['admin', 'manager', 'receptionist']}>
                    <Bookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="guests"
                element={
                  <ProtectedRoute roles={['admin', 'manager', 'receptionist']}>
                    <Guests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="billing"
                element={
                  <ProtectedRoute roles={['admin', 'manager', 'receptionist']}>
                    <Billing />
                  </ProtectedRoute>
                }
              />
              <Route
                path="maintenance"
                element={
                  <ProtectedRoute roles={['admin', 'manager', 'housekeeping']}>
                    <Maintenance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reviews"
                element={
                  <ProtectedRoute roles={['admin', 'manager']}>
                    <Feedback />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <ProtectedRoute roles={['admin', 'manager']}>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <ProtectedRoute roles={['admin', 'manager']}>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route path="account" element={<Profile />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </AlertProvider>
    </BrowserRouter>
  );
}

export default App;
