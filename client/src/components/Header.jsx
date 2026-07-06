import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Header({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="header">
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{title}</h2>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '0.5rem 1rem',
          borderRadius: '9999px',
          border: '1px solid var(--border-light)'
        }}>
          {user?.role === 'admin' ? (
            <Shield size={16} style={{ color: 'var(--color-level-5)' }} />
          ) : (
            <User size={16} style={{ color: 'var(--color-level-1)' }} />
          )}
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
            {user?.fullName} 
            <span style={{ 
              color: 'var(--text-muted)', 
              fontSize: '0.75rem', 
              marginLeft: '0.5rem',
              fontWeight: 400
            }}>
              ({user?.role === 'admin' ? 'Super Admin' : `Học viên Cấp ${user?.level}`})
            </span>
          </span>
        </div>
        
        <button 
          onClick={handleLogout} 
          className="btn btn-secondary" 
          style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          title="Đăng xuất"
        >
          <LogOut size={16} />
          <span style={{ fontSize: '0.875rem' }}>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}
