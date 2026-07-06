import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { 
  Users, BookOpen, Check, X, Plus, Trash2, Edit3, 
  Lock, Unlock, Eye, Award, ClipboardList, PlusCircle, MinusCircle, CheckCircle, XCircle 
} from 'lucide-react';

const LEVELS = [
  { id: 1, name: 'Customer (Cấp 1)' },
  { id: 2, name: 'New Starter (Cấp 2)' },
  { id: 3, name: 'Junior (Cấp 3)' },
  { id: 4, name: 'Senior (Cấp 4)' },
  { id: 5, name: 'Core Leader (Cấp 5)' }
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [tests, setTests] = useState([]);
  const [requests, setRequests] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals / Panels States
  const [studentForm, setStudentForm] = useState(null); // { mode: 'create' } hoặc { mode: 'edit', data: ... }
  const [lessonForm, setLessonForm] = useState(null); // { mode: 'create' } hoặc { mode: 'edit', data: ... }
  const [testForm, setTestForm] = useState(null); // { mode: 'create' } hoặc { mode: 'edit', data: ... }
  const [viewProgress, setViewProgress] = useState(null); // student object

  // Tải toàn bộ dữ liệu ban đầu cho Admin
  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'students') {
        const data = await api.getStudents();
        setStudents(data);
      } else if (activeTab === 'lessons') {
        const [lessonsData, testsData] = await Promise.all([
          api.getLessons(),
          api.getTests()
        ]);
        setLessons(lessonsData);
        setTests(testsData);
      } else if (activeTab === 'requests') {
        const data = await api.getLevelUpRequests();
        setRequests(data);
      } else if (activeTab === 'submissions') {
        const data = await api.getTestSubmissions();
        setSubmissions(data);
      }
    } catch (err) {
      console.error(err);
      setError('Không thể kết nối API hoặc tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg, type = 'success') => {
    if (type === 'success') {
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(msg);
      setTimeout(() => setError(''), 4000);
    }
  };

  // -------------------------------------------------------------
  // HỌC VIÊN: THÊM / SỬA / XÓA / KHÓA
  // -------------------------------------------------------------
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setError('');
    const form = e.target;
    const username = form.username?.value;
    const password = form.password?.value;
    const fullName = form.fullName.value;
    const level = parseInt(form.level.value, 10);
    const status = form.status?.value || 'active';

    try {
      if (studentForm.mode === 'create') {
        await api.createStudent({ username, password, fullName, level });
        showNotification('Thêm học viên thành công!');
      } else {
        await api.updateStudent(studentForm.data.id, { fullName, password, level, status });
        showNotification('Cập nhật học viên thành công!');
      }
      setStudentForm(null);
      loadAllData();
    } catch (err) {
      showNotification(err.message || 'Lỗi lưu thông tin học viên', 'error');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa học viên này? Toàn bộ kết quả học tập sẽ bị xóa.')) return;
    try {
      await api.deleteStudent(id);
      showNotification('Đã xóa học viên.');
      loadAllData();
    } catch (err) {
      showNotification(err.message || 'Không thể xóa học viên', 'error');
    }
  };

  const handleToggleLockStudent = async (student) => {
    const newStatus = student.status === 'active' ? 'locked' : 'active';
    try {
      await api.updateStudent(student.id, { status: newStatus });
      showNotification(newStatus === 'locked' ? 'Đã khóa học viên.' : 'Đã mở khóa học viên.');
      loadAllData();
    } catch (err) {
      showNotification(err.message || 'Lỗi thao tác tài khoản', 'error');
    }
  };

  // Xem chi tiết tiến độ học viên
  const [studentProgressDetail, setStudentProgressDetail] = useState(null);
  const handleViewStudentProgress = async (student) => {
    try {
      const data = await api.getStudentProgress(student.id);
      setStudentProgressDetail(data);
      setViewProgress(student);
    } catch (err) {
      showNotification('Không thể tải tiến trình học viên này.', 'error');
    }
  };

  // -------------------------------------------------------------
  // BÀI HỌC: THÊM / SỬA / XÓA
  // -------------------------------------------------------------
  const handleSaveLesson = async (e) => {
    e.preventDefault();
    const form = e.target;
    const title = form.title.value;
    const level = parseInt(form.level.value, 10);
    const orderIndex = parseInt(form.orderIndex.value, 10);
    const videoUrl = form.videoUrl.value;
    const content = form.content.value;

    try {
      if (lessonForm.mode === 'create') {
        await api.createLesson({ title, level, orderIndex, videoUrl, content });
        showNotification('Thêm bài học mới thành công!');
      } else {
        await api.updateLesson(lessonForm.data.id, { title, level, orderIndex, videoUrl, content });
        showNotification('Cập nhật bài học thành công!');
      }
      setLessonForm(null);
      loadAllData();
    } catch (err) {
      showNotification(err.message || 'Lỗi lưu bài học.', 'error');
    }
  };

  const handleDeleteLesson = async (id) => {
    if (!window.confirm('Bạn muốn xóa bài học này?')) return;
    try {
      await api.deleteLesson(id);
      showNotification('Đã xóa bài học.');
      loadAllData();
    } catch (err) {
      showNotification(err.message || 'Không thể xóa bài học', 'error');
    }
  };


  // -------------------------------------------------------------
  // BÀI TEST: THÊM / SỬA / XÓA (Tùy chỉnh câu hỏi và điểm đạt)
  // -------------------------------------------------------------
  const [testQuestions, setTestQuestions] = useState([]);

  // Đồng bộ danh sách câu hỏi khi mở form test
  useEffect(() => {
    if (testForm) {
      if (testForm.mode === 'edit' && testForm.data.questions) {
        setTestQuestions(testForm.data.questions);
      } else {
        // Mặc định tạo sẵn 1 câu hỏi trống
        setTestQuestions([{ questionText: '', options: ['', ''], correctOptionIndex: 0 }]);
      }
    }
  }, [testForm]);

  const handleAddQuestion = () => {
    setTestQuestions(prev => [...prev, { questionText: '', options: ['', ''], correctOptionIndex: 0 }]);
  };

  const handleRemoveQuestion = (qIdx) => {
    setTestQuestions(prev => prev.filter((_, idx) => idx !== qIdx));
  };

  const handleQuestionTextChange = (qIdx, text) => {
    setTestQuestions(prev => prev.map((q, idx) => idx === qIdx ? { ...q, questionText: text } : q));
  };

  const handleOptionChange = (qIdx, optIdx, text) => {
    setTestQuestions(prev => prev.map((q, idx) => {
      if (idx === qIdx) {
        const newOpts = [...q.options];
        newOpts[optIdx] = text;
        return { ...q, options: newOpts };
      }
      return q;
    }));
  };

  const handleAddOption = (qIdx) => {
    setTestQuestions(prev => prev.map((q, idx) => {
      if (idx === qIdx) {
        return { ...q, options: [...q.options, ''] };
      }
      return q;
    }));
  };

  const handleRemoveOption = (qIdx, optIdx) => {
    setTestQuestions(prev => prev.map((q, idx) => {
      if (idx === qIdx) {
        const newOpts = q.options.filter((_, oIdx) => oIdx !== optIdx);
        // Đảm bảo correctOptionIndex không vượt quá số đáp án mới
        let correctIdx = q.correctOptionIndex;
        if (correctIdx >= newOpts.length) correctIdx = 0;
        return { ...q, options: newOpts, correctOptionIndex: correctIdx };
      }
      return q;
    }));
  };

  const handleCorrectOptionChange = (qIdx, val) => {
    setTestQuestions(prev => prev.map((q, idx) => idx === qIdx ? { ...q, correctOptionIndex: parseInt(val, 10) } : q));
  };

  const handleSaveTest = async (e) => {
    e.preventDefault();
    const form = e.target;
    const title = form.title.value;
    const level = parseInt(form.level.value, 10);
    const passingScore = parseInt(form.passingScore.value, 10);

    // Validate câu hỏi
    if (testQuestions.length === 0) {
      showNotification('Vui lòng thêm ít nhất 1 câu hỏi cho bài test.', 'error');
      return;
    }

    const invalidQuestion = testQuestions.some(q => !q.questionText.trim() || q.options.some(opt => !opt.trim()));
    if (invalidQuestion) {
      showNotification('Vui lòng điền đầy đủ câu hỏi và các đáp án.', 'error');
      return;
    }

    try {
      const payload = { title, level, passingScore, questions: testQuestions };
      if (testForm.mode === 'create') {
        await api.createTest(payload);
        showNotification('Tạo bài trắc nghiệm thành công!');
      } else {
        await api.updateTest(testForm.data.id, payload);
        showNotification('Cập nhật bài trắc nghiệm thành công!');
      }
      setTestForm(null);
      loadAllData();
    } catch (err) {
      showNotification(err.message || 'Lỗi lưu bài test.', 'error');
    }
  };

  const handleDeleteTest = async (id) => {
    if (!window.confirm('Bạn muốn xóa bài trắc nghiệm này?')) return;
    try {
      await api.deleteTest(id);
      showNotification('Đã xóa bài test.');
      loadAllData();
    } catch (err) {
      showNotification(err.message || 'Không thể xóa bài test', 'error');
    }
  };


  // -------------------------------------------------------------
  // PHÊ DUYỆT YÊU CẦU LÊN CẤP (APPROVE / REJECT)
  // -------------------------------------------------------------
  const handleApproveRequest = async (id) => {
    try {
      await api.approveLevelUp(id);
      showNotification('Đã phê duyệt yêu cầu lên cấp.');
      loadAllData();
    } catch (err) {
      showNotification(err.message || 'Lỗi duyệt yêu cầu', 'error');
    }
  };

  const handleRejectRequest = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn từ chối yêu cầu lên cấp của học viên này?')) return;
    try {
      await api.rejectLevelUp(id);
      showNotification('Đã từ chối yêu cầu lên cấp.');
      loadAllData();
    } catch (err) {
      showNotification(err.message || 'Lỗi từ chối yêu cầu', 'error');
    }
  };

  const getLevelLabel = (levelId) => {
    const level = LEVELS.find(l => l.id === levelId);
    return level ? level.name : `Cấp ${levelId}`;
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setStudentForm(null);
          setLessonForm(null);
          setTestForm(null);
          setViewProgress(null);
        }}
      />

      <div className="main-content">
        <Header title="Hệ thống Quản trị Super Admin" />

        {/* Thông báo */}
        {error && (
          <div className="alert-box alert-error animate-fade-in" style={{ marginTop: 0 }}>
            <XCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert-box alert-success animate-fade-in" style={{ marginTop: 0 }}>
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <span>Đang tải dữ liệu admin...</span>
          </div>
        ) : (
          <div className="animate-fade-in" style={{ flex: 1 }}>
            
            {/* -------------------------------------------------------------
                TAB 1: QUẢN LÝ HỌC VIÊN
                ------------------------------------------------------------- */}
            {activeTab === 'students' && !studentForm && !viewProgress && (
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem' }}>Danh sách Học viên ({students.length})</h3>
                  <button 
                    onClick={() => setStudentForm({ mode: 'create' })}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <Plus size={16} />
                    Thêm Học viên Mới
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <th style={{ padding: '1rem 0.75rem' }}>HỌ TÊN</th>
                        <th style={{ padding: '1rem 0.75rem' }}>TÀI KHOẢN</th>
                        <th style={{ padding: '1rem 0.75rem' }}>CẤP ĐỘ HIỆN TẠI</th>
                        <th style={{ padding: '1rem 0.75rem' }}>TRẠNG THÁI</th>
                        <th style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            Chưa có học viên nào trong hệ thống.
                          </td>
                        </tr>
                      ) : (
                        students.map((student) => (
                          <tr key={student.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                            <td style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>{student.fullName}</td>
                            <td style={{ padding: '1rem 0.75rem', color: 'var(--text-muted)' }}>{student.username}</td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <span className={`level-badge level-badge-${student.level}`}>
                                Cấp {student.level}
                              </span>
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <span className={`status-badge status-${student.status}`}>
                                {student.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem 0.75rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <button 
                                onClick={() => handleViewStudentProgress(student)}
                                className="btn btn-secondary" 
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                                title="Xem tiến trình học tập"
                              >
                                <Eye size={14} />
                              </button>
                              <button 
                                onClick={() => setStudentForm({ mode: 'edit', data: student })}
                                className="btn btn-secondary" 
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                                title="Sửa học viên"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button 
                                onClick={() => handleToggleLockStudent(student)}
                                className="btn btn-secondary" 
                                style={{ 
                                  padding: '0.4rem 0.6rem', 
                                  fontSize: '0.75rem',
                                  color: student.status === 'active' ? '#ef4444' : '#10b981'
                                }}
                                title={student.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                              >
                                {student.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
                              </button>
                              <button 
                                onClick={() => handleDeleteStudent(student.id)}
                                className="btn btn-danger" 
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                                title="Xóa học viên"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* FORM THÊM / SỬA HỌC VIÊN */}
            {activeTab === 'students' && studentForm && (
              <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                  {studentForm.mode === 'create' ? 'Tạo Học viên Mới' : `Sửa Thông tin: ${studentForm.data.username}`}
                </h3>
                
                <form onSubmit={handleSaveStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Tên đầy đủ</label>
                    <input 
                      type="text" 
                      name="fullName" 
                      className="form-control" 
                      defaultValue={studentForm.mode === 'edit' ? studentForm.data.fullName : ''} 
                      placeholder="Nguyễn Văn A..." 
                      required 
                    />
                  </div>

                  {studentForm.mode === 'create' ? (
                    <div className="form-group">
                      <label className="form-label">Tên đăng nhập</label>
                      <input 
                        type="text" 
                        name="username" 
                        className="form-control" 
                        placeholder="username..." 
                        required 
                      />
                    </div>
                  ) : null}

                  <div className="form-group">
                    <label className="form-label">
                      Mật khẩu {studentForm.mode === 'edit' && '(Để trống nếu không muốn thay đổi)'}
                    </label>
                    <input 
                      type="password" 
                      name="password" 
                      className="form-control" 
                      placeholder="Mật khẩu..." 
                      required={studentForm.mode === 'create'} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cấp độ ban đầu / Hiện tại</label>
                    <select name="level" className="form-control" defaultValue={studentForm.mode === 'edit' ? studentForm.data.level : 1}>
                      {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>

                  {studentForm.mode === 'edit' && (
                    <div className="form-group">
                      <label className="form-label">Trạng thái tài khoản</label>
                      <select name="status" className="form-control" defaultValue={studentForm.data.status}>
                        <option value="active">Hoạt động (Active)</option>
                        <option value="locked">Khóa tài khoản (Locked)</option>
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setStudentForm(null)} 
                      className="btn btn-secondary"
                    >
                      Hủy bỏ
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                    >
                      {studentForm.mode === 'create' ? 'Tạo Học viên' : 'Cập nhật'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* XEM TIẾN TRÌNH CHI TIẾT HỌC VIÊN */}
            {activeTab === 'students' && viewProgress && studentProgressDetail && (
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Học viên: {viewProgress.fullName}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Tài khoản: <strong>{viewProgress.username}</strong> | Cấp quyền hiện tại: <span className={`level-badge level-badge-${viewProgress.level}`}>Cấp {viewProgress.level}</span>
                    </p>
                  </div>
                  <button onClick={() => { setViewProgress(null); setStudentProgressDetail(null); }} className="btn btn-secondary">
                    Quay lại danh sách
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
                  
                  {/* Cột trái: Tiến độ bài học */}
                  <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(0, 0, 0, 0.1)' }}>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#a78bfa' }}>Bài học đã hoàn thành</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {lessons.map(l => {
                        const isDone = studentProgressDetail.completedLessons.includes(l.id);
                        return (
                          <div key={l.id} style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            background: isDone ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid var(--border-light)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{l.title}</p>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Thuộc Cấp {l.level}</span>
                            </div>
                            {isDone ? (
                              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 500 }}>
                                <CheckCircle size={14} /> Hoàn thành
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Chưa học</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cột phải: Lượt làm bài kiểm tra */}
                  <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(0, 0, 0, 0.1)' }}>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#34d399' }}>Kết quả làm bài kiểm tra</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {studentProgressDetail.testSubmissions.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>Học viên này chưa làm bài kiểm tra nào.</p>
                      ) : (
                        studentProgressDetail.testSubmissions.map(sub => (
                          <div key={sub.id} style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            background: sub.passed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                            border: `1px solid ${sub.passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{sub.testTitle}</p>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cấp {sub.testLevel} | Nộp ngày: {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ fontSize: '1.1rem', color: sub.passed ? '#34d399' : '#fc8181' }}>{sub.score}%</strong>
                              <span style={{ display: 'block', fontSize: '0.7rem', color: sub.passed ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                                {sub.passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}


            {/* -------------------------------------------------------------
                TAB 2: BÀI HỌC & BÀI KIỂM TRA (LIST & CRUD)
                ------------------------------------------------------------- */}
            {activeTab === 'lessons' && !lessonForm && !testForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* PHÂN VÙNG BÀI HỌC */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.25rem' }}>Quản lý Bài học</h3>
                    <button 
                      onClick={() => setLessonForm({ mode: 'create' })}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Plus size={16} />
                      Tạo Bài học Mới
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {lessons.map(l => (
                      <div key={l.id} style={{
                        padding: '1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem'
                      }} className="glass-panel-hover">
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{l.title}</p>
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            <span className={`level-badge level-badge-${l.level}`} style={{ padding: '0.05rem 0.4rem', fontSize: '0.65rem' }}>
                              Cấp {l.level}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Thứ tự: {l.orderIndex}</span>
                            {l.videoUrl && (
                              <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>YouTube Embed Sẵn sàng</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          <button 
                            onClick={() => setLessonForm({ mode: 'edit', data: l })}
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            <Edit3 size={14} /> Sửa
                          </button>
                          <button 
                            onClick={() => handleDeleteLesson(l.id)}
                            className="btn btn-danger" 
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            <Trash2 size={14} /> Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PHÂN VÙNG BÀI KIỂM TRA (TEST) */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.25rem' }}>Quản lý Bài kiểm tra Trắc nghiệm</h3>
                    <button 
                      onClick={() => setTestForm({ mode: 'create' })}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Plus size={16} />
                      Tạo Bài Test Mới
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {tests.map(t => (
                      <div key={t.id} style={{
                        padding: '1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem'
                      }} className="glass-panel-hover">
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t.title}</p>
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            <span className={`level-badge level-badge-${t.level}`} style={{ padding: '0.05rem 0.4rem', fontSize: '0.65rem' }}>
                              Cấp {t.level}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Số câu hỏi: {t.questions?.length || 0}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-level-5)', fontWeight: 500 }}>
                              Điểm chuẩn đạt: {t.passingScore}% (Có thể thay đổi)
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          <button 
                            onClick={() => setTestForm({ mode: 'edit', data: t })}
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            <Edit3 size={14} /> Sửa
                          </button>
                          <button 
                            onClick={() => handleDeleteTest(t.id)}
                            className="btn btn-danger" 
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            <Trash2 size={14} /> Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* FORM THÊM / SỬA BÀI HỌC */}
            {activeTab === 'lessons' && lessonForm && (
              <div className="glass-panel" style={{ padding: '2rem', maxWidth: '750px', margin: '0 auto' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                  {lessonForm.mode === 'create' ? 'Tạo Bài học Mới' : 'Sửa Bài học'}
                </h3>
                
                <form onSubmit={handleSaveLesson} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Cấp độ bài học</label>
                      <select name="level" className="form-control" defaultValue={lessonForm.mode === 'edit' ? lessonForm.data.level : 1}>
                        {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Thứ tự hiển thị (Order Index)</label>
                      <input 
                        type="number" 
                        name="orderIndex" 
                        className="form-control" 
                        defaultValue={lessonForm.mode === 'edit' ? lessonForm.data.orderIndex : 1} 
                        required 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tiêu đề bài học</label>
                    <input 
                      type="text" 
                      name="title" 
                      className="form-control" 
                      defaultValue={lessonForm.mode === 'edit' ? lessonForm.data.title : ''} 
                      placeholder="Nhập tiêu đề..." 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">URL Video YouTube (Để nhúng phát trực tiếp)</label>
                    <input 
                      type="text" 
                      name="videoUrl" 
                      className="form-control" 
                      defaultValue={lessonForm.mode === 'edit' ? lessonForm.data.videoUrl : ''} 
                      placeholder="https://www.youtube.com/watch?v=..." 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nội dung bài học (Học viên đọc)</label>
                    <textarea 
                      name="content" 
                      className="form-control" 
                      rows="8" 
                      defaultValue={lessonForm.mode === 'edit' ? lessonForm.data.content : ''} 
                      placeholder="Viết nội dung bài học hoặc dán văn bản Markdown/HTML tại đây..." 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setLessonForm(null)} 
                      className="btn btn-secondary"
                    >
                      Hủy bỏ
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                    >
                      Lưu bài học
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* FORM THÊM / SỬA BÀI TEST TRẮC NGHIỆM */}
            {activeTab === 'lessons' && testForm && (
              <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                  {testForm.mode === 'create' ? 'Tạo Bài kiểm tra Mới' : 'Sửa Bài kiểm tra'}
                </h3>

                <form onSubmit={handleSaveTest} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Thuộc Cấp độ</label>
                      <select name="level" className="form-control" defaultValue={testForm.mode === 'edit' ? testForm.data.level : 1}>
                        {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Tỷ lệ điểm đạt chuẩn (%, Mặc định 80%)</label>
                      <input 
                        type="number" 
                        name="passingScore" 
                        min="1" 
                        max="100" 
                        className="form-control" 
                        defaultValue={testForm.mode === 'edit' ? testForm.data.passingScore : 80} 
                        required 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tiêu đề bài trắc nghiệm</label>
                    <input 
                      type="text" 
                      name="title" 
                      className="form-control" 
                      defaultValue={testForm.mode === 'edit' ? testForm.data.title : ''} 
                      placeholder="Bài kiểm tra trắc nghiệm Cấp..." 
                      required 
                    />
                  </div>

                  {/* THIẾT KẾ CÂU HỎI TRỰC QUAN */}
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <h4 style={{ fontSize: '1.1rem', color: '#a78bfa' }}>Danh sách câu hỏi ({testQuestions.length})</h4>
                      <button 
                        type="button" 
                        onClick={handleAddQuestion}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <PlusCircle size={14} /> Thêm câu hỏi
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {testQuestions.map((q, qIdx) => (
                        <div key={qIdx} style={{
                          padding: '1.25rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '10px',
                          position: 'relative'
                        }}>
                          {/* Nút xóa câu hỏi */}
                          {testQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(qIdx)}
                              style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: 'transparent',
                                border: 0,
                                color: '#ef4444',
                                cursor: 'pointer'
                              }}
                              title="Xóa câu hỏi này"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}

                          <div className="form-group" style={{ paddingRight: '2rem' }}>
                            <label className="form-label" style={{ color: '#fff', fontWeight: 600 }}>Câu {qIdx + 1}: Nội dung câu hỏi</label>
                            <input 
                              type="text" 
                              className="form-control"
                              value={q.questionText}
                              onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                              placeholder="Nhập câu hỏi trắc nghiệm..."
                              required
                            />
                          </div>

                          {/* Danh sách đáp án của câu hỏi */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                            <label className="form-label">Các lựa chọn trả lời & Chọn đáp án đúng</label>
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <input 
                                  type="radio" 
                                  name={`correct-option-${qIdx}`}
                                  checked={q.correctOptionIndex === optIdx}
                                  onChange={() => handleCorrectOptionChange(qIdx, optIdx)}
                                  title="Đánh dấu đây là đáp án đúng"
                                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                                />
                                <input 
                                  type="text" 
                                  className="form-control"
                                  value={opt}
                                  onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                                  placeholder={`Lựa chọn ${optIdx + 1}...`}
                                  style={{ flex: 1 }}
                                  required
                                />
                                {q.options.length > 2 && (
                                  <button 
                                    type="button"
                                    onClick={() => handleRemoveOption(qIdx, optIdx)}
                                    style={{ background: 'transparent', border: 0, color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                                    title="Xóa lựa chọn này"
                                  >
                                    <MinusCircle size={16} />
                                  </button>
                                )}
                              </div>
                            ))}

                            <button 
                              type="button" 
                              onClick={() => handleAddOption(qIdx)}
                              className="btn btn-secondary"
                              style={{ 
                                padding: '0.35rem 0.75rem', 
                                fontSize: '0.75rem', 
                                alignSelf: 'flex-start',
                                marginTop: '0.25rem' 
                              }}
                            >
                              + Thêm Lựa chọn trả lời
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setTestForm(null)} 
                      className="btn btn-secondary"
                    >
                      Hủy bỏ
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                    >
                      Lưu bài kiểm tra
                    </button>
                  </div>
                </form>
              </div>
            )}


            {/* -------------------------------------------------------------
                TAB 3: PHÊ DUYỆT YÊU CẦU LÊN CẤP
                ------------------------------------------------------------- */}
            {activeTab === 'requests' && (
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Các yêu cầu xin nâng cấp bậc học</h3>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <th style={{ padding: '1rem 0.75rem' }}>HỌC VIÊN</th>
                        <th style={{ padding: '1rem 0.75rem' }}>CẤP HIỆN TẠI</th>
                        <th style={{ padding: '1rem 0.75rem' }}>CẤP XIN NÂNG</th>
                        <th style={{ padding: '1rem 0.75rem' }}>NGÀY GỬI</th>
                        <th style={{ padding: '1rem 0.75rem' }}>TRẠNG THÁI</th>
                        <th style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>DUYỆT YÊU CẦU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            Chưa có yêu cầu xin lên cấp nào.
                          </td>
                        </tr>
                      ) : (
                        requests.map((req) => (
                          <tr key={req.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <strong style={{ display: 'block' }}>{req.studentName}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.studentUsername}</span>
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <span className={`level-badge level-badge-${req.currentLevel}`}>Cấp {req.currentLevel}</span>
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <span className={`level-badge level-badge-${req.requestedLevel}`}>Cấp {req.requestedLevel}</span>
                            </td>
                            <td style={{ padding: '1rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              {new Date(req.createdAt).toLocaleString('vi-VN')}
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              {req.status === 'pending' && <span className="status-badge" style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }}>Đang chờ duyệt</span>}
                              {req.status === 'approved' && <span className="status-badge status-active">Đã duyệt</span>}
                              {req.status === 'rejected' && <span className="status-badge status-locked">Bị từ chối</span>}
                            </td>
                            <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                              {req.status === 'pending' ? (
                                <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => handleApproveRequest(req.id)}
                                    className="btn btn-success"
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                  >
                                    <Check size={14} /> Phê duyệt
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(req.id)}
                                    className="btn btn-danger"
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                  >
                                    <X size={14} /> Từ chối
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Đã xử lý {req.reviewedAt && `lúc ${new Date(req.reviewedAt).toLocaleDateString('vi-VN')}`}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}


            {/* -------------------------------------------------------------
                TAB 4: KẾT QUẢ BÀI LÀM QUIZ CỦA TẤT CẢ HỌC VIÊN
                ------------------------------------------------------------- */}
            {activeTab === 'submissions' && (
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Lịch sử & Điểm số Làm bài trắc nghiệm</h3>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <th style={{ padding: '1rem 0.75rem' }}>HỌC VIÊN</th>
                        <th style={{ padding: '1rem 0.75rem' }}>BÀI KIỂM TRA</th>
                        <th style={{ padding: '1rem 0.75rem' }}>ĐIỂM SỐ</th>
                        <th style={{ padding: '1rem 0.75rem' }}>KẾT QUẢ</th>
                        <th style={{ padding: '1rem 0.75rem' }}>NGÀY NỘP BÀI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            Chưa có lượt nộp bài test nào được ghi nhận.
                          </td>
                        </tr>
                      ) : (
                        submissions.map((sub) => (
                          <tr key={sub.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <strong style={{ display: 'block' }}>{sub.studentName}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub.studentUsername}</span>
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <strong style={{ display: 'block' }}>{sub.testTitle}</strong>
                              <span className={`level-badge level-badge-${sub.testLevel}`} style={{ padding: '0.05rem 0.3rem', fontSize: '0.6rem', marginTop: '0.15rem' }}>
                                Cấp {sub.testLevel}
                              </span>
                            </td>
                            <td style={{ padding: '1rem 0.75rem', fontSize: '1.1rem', fontWeight: 700, color: sub.passed ? '#34d399' : '#fc8181' }}>
                              {sub.score}%
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              {sub.passed ? (
                                <span className="status-badge status-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <CheckCircle size={12} /> ĐẠT ĐIỂM
                                </span>
                              ) : (
                                <span className="status-badge status-locked" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <XCircle size={12} /> CHƯA ĐẠT (Cần {sub.passingScore}%)
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '1rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
