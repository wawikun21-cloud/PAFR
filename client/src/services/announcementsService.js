const API_BASE = import.meta.env.VITE_API_URL || '/api';

const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'An error occurred');
  }

  return data.data || data;
};

export const fetchAnnouncements = async () => {
  return apiRequest('/announcements');
};

export const fetchActiveAnnouncements = async (options = {}) => {
  const { limit = 50 } = options;
  try {
    const token = localStorage.getItem('token');
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(`${API_BASE}/announcements`, { headers: authHeaders });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'An error occurred');
    }
    const announcements = (data.data || []).map(a => ({
      ...a,
      announcement_type: a.type || 'general',
      start_date: a.start_date || null,
      end_date: a.end_date || null,
      audience: a.audience || 'all',
      is_pinned: a.is_pinned === 1 || a.is_pinned === true
    }));
    const active = announcements.filter(a => a.status === 'active');
    return { success: true, data: { announcements: active.slice(0, limit) } };
  } catch (error) {
    return { success: false, message: error.message || 'Failed to fetch announcements' };
  }
};

export const fetchAnnouncement = async (id) => {
  return apiRequest(`/announcements/${id}`);
};

export const createAnnouncement = async (announcement) => {
  return apiRequest('/announcements', {
    method: 'POST',
    body: JSON.stringify(announcement),
  });
};

export const updateAnnouncement = async (id, announcement) => {
  return apiRequest(`/announcements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(announcement),
  });
};

export const deleteAnnouncement = async (id) => {
  return apiRequest(`/announcements/${id}`, {
    method: 'DELETE',
  });
};