const BASE_URL = 'http://localhost:5000/api';

// Helper để lấy token
const getHeaders = () => {
  const token = localStorage.getItem('lms_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Authentication
  login: async (username, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi đăng nhập');
    return data;
  },

  getMe: async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi xác thực');
    return data;
  },

  // Admin - Students
  getStudents: async () => {
    const res = await fetch(`${BASE_URL}/admin/students`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi tải danh sách học viên');
    return data;
  },

  createStudent: async (studentData) => {
    const res = await fetch(`${BASE_URL}/admin/students`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(studentData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi tạo học viên');
    return data;
  },

  updateStudent: async (id, studentData) => {
    const res = await fetch(`${BASE_URL}/admin/students/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(studentData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật học viên');
    return data;
  },

  deleteStudent: async (id) => {
    const res = await fetch(`${BASE_URL}/admin/students/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi xóa học viên');
    return data;
  },

  getStudentProgress: async (id) => {
    const res = await fetch(`${BASE_URL}/admin/students/${id}/progress`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi tải tiến độ học viên');
    return data;
  },

  // Lessons
  getLessons: async () => {
    const res = await fetch(`${BASE_URL}/lessons`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi tải danh sách bài học');
    return data;
  },

  getLessonDetail: async (id) => {
    const res = await fetch(`${BASE_URL}/lessons/${id}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi tải chi tiết bài học');
    return data;
  },

  createLesson: async (lessonData) => {
    const res = await fetch(`${BASE_URL}/admin/lessons`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(lessonData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi tạo bài học');
    return data;
  },

  updateLesson: async (id, lessonData) => {
    const res = await fetch(`${BASE_URL}/admin/lessons/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(lessonData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật bài học');
    return data;
  },

  deleteLesson: async (id) => {
    const res = await fetch(`${BASE_URL}/admin/lessons/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi xóa bài học');
    return data;
  },

  completeLesson: async (id) => {
    const res = await fetch(`${BASE_URL}/lessons/${id}/complete`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi hoàn thành bài học');
    return data;
  },

  getLessonsProgress: async () => {
    const res = await fetch(`${BASE_URL}/lessons-progress`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi tải tiến độ học tập');
    return data;
  },

  // Tests
  getTests: async () => {
    const res = await fetch(`${BASE_URL}/tests`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi tải danh sách bài test');
    return data;
  },

  getTestDetail: async (id) => {
    const res = await fetch(`${BASE_URL}/tests/${id}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi tải chi tiết bài test');
    return data;
  },

  createTest: async (testData) => {
    const res = await fetch(`${BASE_URL}/admin/tests`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(testData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi tạo bài test');
    return data;
  },

  updateTest: async (id, testData) => {
    const res = await fetch(`${BASE_URL}/admin/tests/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(testData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật bài test');
    return data;
  },

  deleteTest: async (id) => {
    const res = await fetch(`${BASE_URL}/admin/tests/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi xóa bài test');
    return data;
  },

  submitTest: async (id, answers) => {
    const res = await fetch(`${BASE_URL}/tests/${id}/submit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ answers })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi nộp bài kiểm tra');
    return data;
  },

  getTestSubmissions: async () => {
    const res = await fetch(`${BASE_URL}/test-submissions`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi tải kết quả làm bài');
    return data;
  },

  // Level Up Requests
  requestLevelUp: async () => {
    const res = await fetch(`${BASE_URL}/level-up/request`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi yêu cầu nâng cấp');
    return data;
  },

  getLevelUpRequests: async () => {
    const res = await fetch(`${BASE_URL}/level-up/requests`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi tải danh sách yêu cầu nâng cấp');
    return data;
  },

  approveLevelUp: async (id) => {
    const res = await fetch(`${BASE_URL}/admin/level-up/requests/${id}/approve`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi phê duyệt nâng cấp');
    return data;
  },

  rejectLevelUp: async (id) => {
    const res = await fetch(`${BASE_URL}/admin/level-up/requests/${id}/reject`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi từ chối nâng cấp');
    return data;
  }
};
