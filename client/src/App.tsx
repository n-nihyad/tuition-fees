import { BrowserRouter, Routes, Route } from 'react-router';
import LoginPage from './features/auth/pages/LoginPage';
// import AdminDashboardPage from '@/features/dashboard/pages/AdminDashboardPage';
import UserDashboardPage from '@/features/dashboard/pages/UserDashboardPage';
import PaymentPage from '@/features/payment/pages/PaymentPage';
import RequireAuth from '@/features/auth/components/RequireAuth';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        {/* <Route path="/admin/dashboard" element={<AdminDashboardPage />} /> */}
        <Route
          path="/user/dashboard"
          element={
            <RequireAuth allowedRole="student">
              <UserDashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/user/payment"
          element={
            <RequireAuth allowedRole="student">
              <PaymentPage />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
