import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, Unlock, Shield, Users, BookOpen, 
  ClipboardList, Award, ChevronRight, LogOut 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LEVELS = [
  { id: 1, name: 'Customer', desc: 'Cấp 1: Khách hàng' },
  { id: 2, name: 'New Starter', desc: 'Cấp 2: Thành viên mới' },
  { id: 3, name: 'Junior', desc: 'Cấp 3: Nhân viên' },
  { id: 4, name: 'Senior', desc: 'Cấp 4: Chuyên viên' },
  { id: 5, name: 'Core Leader', desc: 'Cấp 5: Lãnh đạo cốt lõi' }
];

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  selectedLevel, 
  setSelectedLevel 
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getLevelColor = (levelId) => {
    switch(levelId) {
      case 1: return 'var(--color-level-1)';
      case 2: return 'var(--color-level-2)';
      case 3: return 'var(--color-level-3)';
      case 4: return 'var(--color-level-4)';
      case 5: return 'var(--color-level-5)';
      default: return '#fff';
    }
  };

  return (
    <div className="sidebar">
      {/* Brand Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '2.5rem',
        padding: '0 0.5rem'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'var(--grad-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(124, 58, 237, 0.3)'
        }}>
          <Award size={20} color="#fff" />
        </div>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 800,
          fontSize: '1.25rem',
          letterSpacing: '0.05em'
        }}>
          LMS <span style={{ color: '#22d3ee' }}>IGNITE</span>
        </span>
      </div>

      {/* Main Navigation list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {user?.role === 'admin' ? (
          // ADMIN SIDEBAR ITEMS
          <>
            <p style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              Quản trị viên
            </p>

            <button
              onClick={() => setActiveTab('students')}
              className="btn"
              style={{
                justifyContent: 'flex-start',
                background: activeTab === 'students' ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                borderLeft: activeTab === 'students' ? '4px solid #7c3aed' : '4px solid transparent',
                borderRadius: activeTab === 'students' ? '0 8px 8px 0' : '8px',
                padding: '0.75rem 1rem',
                color: activeTab === 'students' ? 'var(--text-bright)' : 'var(--text-muted)'
              }}
            >
              <Users size={18} />
              <span>Học viên</span>
            </button>

            <button
              onClick={() => setActiveTab('lessons')}
              className="btn"
              style={{
                justifyContent: 'flex-start',
                background: activeTab === 'lessons' ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                borderLeft: activeTab === 'lessons' ? '4px solid #7c3aed' : '4px solid transparent',
                borderRadius: activeTab === 'lessons' ? '0 8px 8px 0' : '8px',
                padding: '0.75rem 1rem',
                color: activeTab === 'lessons' ? 'var(--text-bright)' : 'var(--text-muted)'
              }}
            >
              <BookOpen size={18} />
              <span>Bài học & Test</span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className="btn"
              style={{
                justifyContent: 'flex-start',
                background: activeTab === 'requests' ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                borderLeft: activeTab === 'requests' ? '4px solid #7c3aed' : '4px solid transparent',
                borderRadius: activeTab === 'requests' ? '0 8px 8px 0' : '8px',
                padding: '0.75rem 1rem',
                color: activeTab === 'requests' ? 'var(--text-bright)' : 'var(--text-muted)'
              }}
            >
              <Award size={18} />
              <span>Yêu cầu lên cấp</span>
            </button>

            <button
              onClick={() => setActiveTab('submissions')}
              className="btn"
              style={{
                justifyContent: 'flex-start',
                background: activeTab === 'submissions' ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                borderLeft: activeTab === 'submissions' ? '4px solid #7c3aed' : '4px solid transparent',
                borderRadius: activeTab === 'submissions' ? '0 8px 8px 0' : '8px',
                padding: '0.75rem 1rem',
                color: activeTab === 'submissions' ? 'var(--text-bright)' : 'var(--text-muted)'
              }}
            >
              <ClipboardList size={18} />
              <span>Điểm bài test</span>
            </button>
          </>
        ) : (
          // STUDENT SIDEBAR ITEMS (5 Levels list)
          <>
            <p style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              Cấp độ đào tạo
            </p>

            {LEVELS.map((level) => {
              const isUnlocked = user?.level >= level.id;
              const isSelected = selectedLevel === level.id;
              const levelColor = getLevelColor(level.id);

              return (
                <button
                  key={level.id}
                  disabled={false} // Cho phép click để xem trạng thái (nếu khóa thì giao diện báo cụ thể)
                  onClick={() => setSelectedLevel(level.id)}
                  className="btn"
                  style={{
                    justifyContent: 'flex-start',
                    background: isSelected 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'transparent',
                    borderLeft: isSelected 
                      ? `4px solid ${levelColor}` 
                      : '4px solid transparent',
                    borderRadius: isSelected ? '0 8px 8px 0' : '8px',
                    padding: '0.75rem 1rem',
                    opacity: isUnlocked ? 1 : 0.45,
                    cursor: 'pointer',
                    color: isSelected ? 'var(--text-bright)' : 'var(--text-muted)',
                    position: 'relative'
                  }}
                >
                  {isUnlocked ? (
                    <Unlock size={16} style={{ color: levelColor, flexShrink: 0 }} />
                  ) : (
                    <Lock size={16} style={{ color: 'rgba(255, 255, 255, 0.4)', flexShrink: 0 }} />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: '0.25rem' }}>
                    <span style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? '#fff' : 'inherit'
                    }}>
                      {level.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                      {level.desc}
                    </span>
                  </div>
                  {isSelected && (
                    <ChevronRight size={16} style={{ marginLeft: 'auto', color: levelColor }} />
                  )}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Sidebar Footer */}
      <div style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border-light)',
        paddingTop: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.5rem'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px #10b981'
          }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hệ thống đang hoạt động</span>
        </div>
      </div>
    </div>
  );
}
