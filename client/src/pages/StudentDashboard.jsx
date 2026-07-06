import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { 
  Lock, CheckCircle, Play, FileText, HelpCircle, 
  ChevronRight, AlertTriangle, Send, RefreshCw, Award, BookOpen 
} from 'lucide-react';

export default function StudentDashboard() {
  const { user, refreshUser } = useAuth();
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [lessons, setLessons] = useState([]);
  const [tests, setTests] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [activeTest, setActiveTest] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [levelRequests, setLevelRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Tải dữ liệu ban đầu
  useEffect(() => {
    if (user) {
      setSelectedLevel(user.level);
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [lessonsData, testsData, progressData, submissionsData, requestsData] = await Promise.all([
        api.getLessons(),
        api.getTests(),
        api.getLessonsProgress(),
        api.getTestSubmissions(),
        api.getLevelUpRequests()
      ]);

      setLessons(lessonsData);
      setTests(testsData);
      setCompletedLessons(progressData.map(p => p.lessonId));
      setSubmissions(submissionsData);
      setLevelRequests(requestsData);

      // Reset các bài học & test đang mở
      setActiveLesson(null);
      setActiveTest(null);
      setQuizResult(null);
      setQuizAnswers({});
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu. Vui lòng tải lại trang.');
    } finally {
      setLoading(false);
    }
  };

  // Helper chuyển đổi URL Youtube thành link Embed
  const getYoutubeEmbedUrl = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return '';
  };

  // Đánh dấu hoàn thành bài học
  const handleCompleteLesson = async (lessonId) => {
    setActionLoading(true);
    setError('');
    try {
      await api.completeLesson(lessonId);
      setCompletedLessons(prev => [...prev, lessonId]);
      setSuccessMsg('Đã đánh dấu bài học hoàn thành!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Lỗi lưu tiến độ bài học.');
    } finally {
      setActionLoading(false);
    }
  };

  // Nộp bài kiểm tra
  const handleSubmitQuiz = async (testId) => {
    const test = tests.find(t => t.id === testId);
    if (!test) return;

    // Kiểm tra đã làm hết câu hỏi chưa
    const unanswered = test.questions.filter(q => quizAnswers[q.id] === undefined);
    if (unanswered.length > 0) {
      setError('Vui lòng trả lời toàn bộ câu hỏi trước khi nộp bài.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      const result = await api.submitTest(testId, quizAnswers);
      setQuizResult(result);
      
      // Tải lại submissions để cập nhật trạng thái đạt
      const submissionsData = await api.getTestSubmissions();
      setSubmissions(submissionsData);
    } catch (err) {
      setError(err.message || 'Lỗi nộp bài kiểm tra.');
    } finally {
      setActionLoading(false);
    }
  };

  // Gửi yêu cầu xin lên cấp
  const handleRequestLevelUp = async () => {
    setActionLoading(true);
    setError('');
    try {
      const data = await api.requestLevelUp();
      setSuccessMsg(data.message);
      
      // Tải lại danh sách yêu cầu
      const requestsData = await api.getLevelUpRequests();
      setLevelRequests(requestsData);
    } catch (err) {
      setError(err.message || 'Lỗi gửi yêu cầu lên cấp.');
    } finally {
      setActionLoading(false);
    }
  };

  // Lấy các bài học của Cấp độ hiện tại đang chọn
  const filteredLessons = lessons.filter(l => l.level === selectedLevel);
  // Lấy các bài test của Cấp độ hiện tại đang chọn
  const filteredTests = tests.filter(t => t.level === selectedLevel);

  // Kiểm tra điều kiện xin lên cấp (chỉ áp dụng nếu selectedLevel === user.level)
  const isLevelUnlocked = user?.level >= selectedLevel;
  const showLevelUpButton = user?.level === selectedLevel && user?.level < 5;

  const checkLevelCompletion = () => {
    // 1. Phải học hết bài học của level hiện tại
    const currentLevelLessons = lessons.filter(l => l.level === user.level);
    const allLessonsDone = currentLevelLessons.every(l => completedLessons.includes(l.id));

    // 2. Phải pass tất cả bài test của level hiện tại
    const currentLevelTests = tests.filter(t => t.level === user.level);
    const allTestsPassed = currentLevelTests.every(test => 
      submissions.some(sub => sub.testId === test.id && sub.passed)
    );

    return allLessonsDone && allTestsPassed;
  };

  const pendingRequest = levelRequests.find(r => r.userId === user?.id && r.status === 'pending');
  const levelCompleted = user ? checkLevelCompletion() : false;

  if (loading) {
    return (
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
        <span>Đang tải dữ liệu học tập...</span>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar 
        activeTab="student"
        selectedLevel={selectedLevel}
        setSelectedLevel={(level) => {
          setSelectedLevel(level);
          setActiveLesson(null);
          setActiveTest(null);
          setQuizResult(null);
          setQuizAnswers({});
        }}
      />

      <div className="main-content">
        <Header title={isLevelUnlocked ? `Cấp độ ${selectedLevel}` : 'Cấp độ đang khóa'} />

        {/* Thông báo thành công/lỗi */}
        {error && (
          <div className="alert-box alert-error animate-fade-in" style={{ marginTop: '0' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert-box alert-success animate-fade-in" style={{ marginTop: '0' }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* NÚT XIN LÊN CẤP NỔI BẬT */}
        {showLevelUpButton && (
          <div className="glass-panel glow-border-purple" style={{
            padding: '1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(20, 27, 45, 0.8) 100%)'
          }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', color: '#a78bfa' }}>Xin Lên Cấp Độ Kế Tiếp</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {levelCompleted 
                  ? 'Chúc mừng! Bạn đã hoàn thành toàn bộ bài học và bài test của cấp này. Bạn có thể xin lên cấp ngay.'
                  : 'Bạn cần hoàn thành toàn bộ bài học và bài kiểm tra ở cấp hiện tại để xin nâng cấp.'}
              </p>
            </div>
            <div>
              {pendingRequest ? (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  background: 'rgba(251, 191, 36, 0.15)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  color: '#fbbf24',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}>
                  <RefreshCw className="animate-spin" size={16} style={{ animation: 'spin 2s linear infinite' }} />
                  Yêu cầu xin lên Cấp {user.level + 1} đang chờ duyệt
                </div>
              ) : (
                <button
                  disabled={!levelCompleted || actionLoading}
                  onClick={handleRequestLevelUp}
                  className={`btn ${levelCompleted ? 'btn-primary' : 'btn-disabled'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Send size={16} />
                  Gửi yêu cầu lên Cấp {user.level + 1}
                </button>
              )}
            </div>
          </div>
        )}

        {/* NẾU CẤP ĐỘ BỊ KHÓA */}
        {!isLevelUnlocked ? (
          <div className="glass-panel animate-fade-in" style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '2px dashed rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              color: '#ef4444'
            }}>
              <Lock size={36} />
            </div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Cấp độ này đang bị khóa</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '500px', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Quyền hạn hiện tại của bạn chưa thể tiếp cận các bài học và bài kiểm tra ở Cấp {selectedLevel}.
              Vui lòng hoàn thành lộ trình đào tạo hiện tại ở Cấp {user?.level} và gửi yêu cầu lên cấp.
            </p>
            <button 
              onClick={() => setSelectedLevel(user?.level)}
              className="btn btn-secondary"
            >
              Quay lại Cấp {user?.level} của bạn
            </button>
          </div>
        ) : (
          // NẾU CẤP ĐỘ ĐƯỢC MỞ KHÓA
          <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem', flex: 1, alignItems: 'start' }}>
            
            {/* CỘT TRÁI: DANH SÁCH BÀI HỌC & BÀI TEST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Box Bài học */}
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                  Bài học ({filteredLessons.length})
                </h3>
                {filteredLessons.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '0.5rem' }}>Chưa có bài học nào cho cấp này.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredLessons.map((lesson) => {
                      const isCompleted = completedLessons.includes(lesson.id);
                      const isActive = activeLesson?.id === lesson.id;
                      return (
                        <div 
                          key={lesson.id}
                          onClick={() => {
                            setActiveLesson(lesson);
                            setActiveTest(null);
                            setQuizResult(null);
                            setQuizAnswers({});
                          }}
                          style={{
                            padding: '0.875rem',
                            borderRadius: '8px',
                            background: isActive ? 'rgba(124, 58, 237, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                            border: isActive ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid var(--border-light)',
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}
                          className="glass-panel-hover"
                        >
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isCompleted ? '#10b981' : 'var(--text-muted)',
                            flexShrink: 0
                          }}>
                            {isCompleted ? <CheckCircle size={16} /> : <Play size={14} />}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <p style={{
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              color: isActive ? '#fff' : 'var(--text-main)'
                            }}>
                              {lesson.title}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Box Bài kiểm tra */}
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                  Bài kiểm tra ({filteredTests.length})
                </h3>
                {filteredTests.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '0.5rem' }}>Chưa có bài kiểm tra nào cho cấp này.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredTests.map((test) => {
                      const userSubmissions = submissions.filter(s => s.testId === test.id);
                      const hasPassed = userSubmissions.some(s => s.passed);
                      const bestScore = userSubmissions.reduce((max, s) => s.score > max ? s.score : max, 0);
                      const isActive = activeTest?.id === test.id;

                      return (
                        <div 
                          key={test.id}
                          onClick={() => {
                            setActiveTest(test);
                            setActiveLesson(null);
                            setQuizResult(null);
                            setQuizAnswers({});
                          }}
                          style={{
                            padding: '0.875rem',
                            borderRadius: '8px',
                            background: isActive ? 'rgba(124, 58, 237, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                            border: isActive ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid var(--border-light)',
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem'
                          }}
                          className="glass-panel-hover"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: hasPassed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: hasPassed ? '#10b981' : 'var(--text-muted)',
                              flexShrink: 0
                            }}>
                              {hasPassed ? <CheckCircle size={16} /> : <FileText size={14} />}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <p style={{
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                color: isActive ? '#fff' : 'var(--text-main)'
                              }}>
                                {test.title}
                              </p>
                              {userSubmissions.length > 0 && (
                                <span style={{ fontSize: '0.7rem', color: hasPassed ? '#34d399' : '#fc8181' }}>
                                  Điểm cao nhất: {bestScore}% ({hasPassed ? 'Đạt' : 'Chưa đạt'})
                                </span>
                              )}
                            </div>
                          </div>
                          {hasPassed && (
                            <span className="level-badge level-badge-2" style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>Pass</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* CỘT PHẢI: CHI TIẾT BÀI HỌC HOẶC BÀI TEST */}
            <div style={{ flex: 1, minHeight: '500px' }}>
              
              {/* CHƯA CHỌN GÌ */}
              {!activeLesson && !activeTest && (
                <div className="glass-panel animate-fade-in" style={{
                  padding: '4rem 2rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text-muted)'
                }}>
                  <BookOpen size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Bắt đầu học tập</h3>
                  <p style={{ fontSize: '0.875rem', maxWidth: '400px', lineHeight: '1.5' }}>
                    Chọn một bài học bên cột trái để đọc tài liệu và xem video hướng dẫn, hoặc chọn bài kiểm tra để đánh giá năng lực của mình.
                  </p>
                </div>
              )}

              {/* CHI TIẾT BÀI HỌC */}
              {activeLesson && (
                <div className="glass-panel animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{activeLesson.title}</h2>
                    <div>
                      {completedLessons.includes(activeLesson.id) ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: '#10b981',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          background: 'rgba(16, 185, 129, 0.1)',
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                          <CheckCircle size={16} />
                          Đã hoàn thành bài học
                        </div>
                      ) : (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleCompleteLesson(activeLesson.id)}
                          className="btn btn-success"
                          style={{ fontSize: '0.875rem' }}
                        >
                          Hoàn thành bài học
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Video YouTube */}
                  {activeLesson.videoUrl && getYoutubeEmbedUrl(activeLesson.videoUrl) ? (
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      paddingTop: '56.25%', /* 16:9 Aspect Ratio */
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: '#000',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--border-light)'
                    }}>
                      <iframe
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          border: 0
                        }}
                        src={getYoutubeEmbedUrl(activeLesson.videoUrl)}
                        title={activeLesson.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : activeLesson.videoUrl ? (
                    <div style={{
                      padding: '1rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-light)'
                    }}>
                      Đường dẫn video: <a href={activeLesson.videoUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>{activeLesson.videoUrl}</a> (Không hỗ trợ nhúng)
                    </div>
                  ) : null}

                  {/* Nội dung bài học */}
                  <div style={{
                    fontSize: '1rem',
                    lineHeight: '1.7',
                    color: 'var(--text-main)',
                    whiteSpace: 'pre-line'
                  }}>
                    {activeLesson.content}
                  </div>
                </div>
              )}

              {/* CHI TIẾT BÀI TEST & LÀM QUIZ */}
              {activeTest && (
                <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
                  <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{activeTest.title}</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      Yêu cầu đạt điểm tối thiểu: <span style={{ color: 'var(--color-level-5)', fontWeight: 600 }}>{activeTest.passingScore}%</span>
                    </p>
                  </div>

                  {/* KẾT QUẢ VỪA LÀM BÀI XONG */}
                  {quizResult ? (
                    <div className="glass-panel" style={{
                      padding: '2rem',
                      textAlign: 'center',
                      background: quizResult.passed 
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 27, 45, 0.8) 100%)' 
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(20, 27, 45, 0.8) 100%)',
                      border: quizResult.passed 
                        ? '1px solid rgba(16, 185, 129, 0.3)' 
                        : '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '1rem',
                      animation: 'fadeIn 0.4s ease-out'
                    }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: quizResult.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: quizResult.passed ? '#10b981' : '#ef4444'
                      }}>
                        {quizResult.passed ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
                      </div>
                      
                      <h3 style={{ fontSize: '1.5rem', color: '#fff' }}>
                        {quizResult.passed ? 'Chúc mừng! Bạn đã hoàn thành!' : 'Bài test chưa đạt yêu cầu'}
                      </h3>
                      
                      <div style={{ fontSize: '1.1rem' }}>
                        Điểm của bạn: <strong style={{ 
                          fontSize: '2rem', 
                          color: quizResult.passed ? '#34d399' : '#fc8181',
                          display: 'block',
                          marginTop: '0.25rem'
                        }}>{quizResult.score}%</strong>
                      </div>

                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: '1.5' }}>
                        {quizResult.passed 
                          ? 'Bạn đã vượt qua bài kiểm tra trắc nghiệm của cấp này. Hệ thống đã lưu trữ kết quả này để xét điều kiện nâng cấp lên cấp kế tiếp.'
                          : `Điểm số tối thiểu để vượt qua là ${quizResult.passingScore}%. Vui lòng ôn lại các bài học và tiến hành thi lại bài trắc nghiệm.`}
                      </p>

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => {
                            setQuizResult(null);
                            setQuizAnswers({});
                          }}
                          className="btn btn-primary"
                        >
                          Thi lại bài test
                        </button>
                        <button
                          onClick={() => {
                            setActiveTest(null);
                            setQuizResult(null);
                            setQuizAnswers({});
                            loadDashboardData(); // Cập nhật lại list ở cột trái
                          }}
                          className="btn btn-secondary"
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                  ) : (
                    // FORM TRẮC NGHIỆM ĐANG LÀM
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      {activeTest.questions && activeTest.questions.map((q, idx) => (
                        <div key={q.id} style={{
                          padding: '1.25rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '10px'
                        }}>
                          <p style={{ fontWeight: 600, marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--color-level-1)' }}>Câu {idx + 1}:</span>
                            <span>{q.questionText}</span>
                          </p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {q.options.map((opt, optIdx) => {
                              const isChecked = quizAnswers[q.id] === optIdx;
                              return (
                                <label
                                  key={optIdx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    background: isChecked ? 'rgba(124, 58, 237, 0.1)' : 'rgba(255, 255, 255, 0.01)',
                                    border: isChecked ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid var(--border-light)',
                                    cursor: 'pointer',
                                    transition: 'var(--transition-smooth)'
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name={`question-${q.id}`}
                                    checked={isChecked}
                                    onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                                    style={{
                                      accentColor: '#7c3aed',
                                      width: '16px',
                                      height: '16px',
                                      cursor: 'pointer'
                                    }}
                                  />
                                  <span style={{ fontSize: '0.9rem' }}>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                        <button
                          onClick={() => {
                            setActiveTest(null);
                            setQuizAnswers({});
                          }}
                          className="btn btn-secondary"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleSubmitQuiz(activeTest.id)}
                          className="btn btn-primary"
                        >
                          Nộp bài & Chấm điểm
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
