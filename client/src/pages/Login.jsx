import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, BookOpen, AlertCircle, Loader } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const user = await login(username.trim(), password);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, rgba(124, 58, 237, 0.15), transparent), radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.1), transparent), #05070f',
      padding: '1.5rem'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '2.5rem',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow effect inside card */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '150px',
          height: '150px',
          background: 'rgba(124, 58, 237, 0.2)',
          filter: 'blur(50px)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        {/* Logo and title */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'var(--grad-primary)',
            marginBottom: '1rem',
            boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)'
          }}>
            <BookOpen size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            LMS <span style={{ background: 'linear-gradient(to right, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>IGNITE</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Hệ thống đào tạo nội bộ 5 cấp bậc cao cấp</p>
        </div>

        {/* Alert box */}
        {error && (
          <div className="alert-box alert-error animate-fade-in">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">TÊN ĐĂNG NHẬP</label>
            <input
              type="text"
              className="form-control"
              placeholder="Nhập tên đăng nhập..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">MẬT KHẨU</label>
            <input
              type="password"
              className="form-control"
              placeholder="Nhập mật khẩu của bạn..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập hệ thống'
            )}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: '0.5rem' }}>Tài khoản demo:</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <span>Admin: <strong style={{ color: 'var(--text-main)' }}>admin / admin123</strong></span>
            <span>Học viên: <strong style={{ color: 'var(--text-main)' }}>student1 / student123</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
