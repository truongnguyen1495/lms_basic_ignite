import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { RefreshCw } from 'lucide-react';

// Spinner component khi đang check auth
const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-main)',
    color: 'var(--text-muted)'
  }}>
    <RefreshCw className="animate-spin" size={36} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
    <span>Đang kiểm tra quyền truy cập...</span>
  </div>
);

// Bảo vệ Router Admin
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/student" replace />;

  return children;
};

// Bảo vệ Router Học viên
const StudentRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'student') return <Navigate to="/admin" replace />;

  return children;
};

// Chuyển hướng trang chủ / dựa trên Role
const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  
  return user.role === 'admin' 
    ? <Navigate to="/admin" replace /> 
    : <Navigate to="/student" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />

          {/* Protected Student Routes */}
          <Route 
            path="/student" 
            element={
              <StudentRoute>
                <StudentDashboard />
              </StudentRoute>
            } 
          />

          {/* Home Route Redirect */}
          <Route path="/" element={<HomeRedirect />} />

          {/* Fallback Catch-All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
