import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function searchSquadrons(search, limit = 50) {
  try {
    const response = await api.get('/squadrons', { params: { search, limit } });
    const body = response.data;
    return {
      success: body?.success !== false,
      squadrons: body?.data?.squadrons ?? [],
      message: body?.message,
    };
  } catch (error) {
    return {
      success: false,
      squadrons: [],
      message: error.response?.data?.message || 'Failed to load squadrons',
    };
  }
}

export async function searchReservistsBySquadrons(squadronIds, search, limit = 50) {
  try {
    const response = await api.get('/squadrons/reservists/search', {
      params: {
        squadron_ids: JSON.stringify(squadronIds),
        search,
        limit,
      },
    });
    const body = response.data;
    return {
      success: body?.success !== false,
      reservists: body?.data?.reservists ?? [],
      message: body?.message,
    };
  } catch (error) {
    return {
      success: false,
      reservists: [],
      message: error.response?.data?.message || 'Failed to search reservists',
    };
  }
}

export async function searchSquadronReservists(squadronId, search, limit = 50) {
  try {
    const response = await api.get(`/squadrons/${squadronId}/reservists`, {
      params: { search, limit },
    });
    const body = response.data;
    return {
      success: body?.success !== false,
      reservists: body?.data?.reservists ?? [],
      message: body?.message,
    };
  } catch (error) {
    return {
      success: false,
      reservists: [],
      message: error.response?.data?.message || 'Failed to load reservists',
    };
  }
}

export async function lookupReservist(serial, name) {
  try {
    const params = {};
    if (serial) params.serial = serial;
    if (name) params.name = name;
    const response = await api.get('/reservists/lookup', { params });
    const body = response.data;
    if (body?.success) {
      return {
        success: true,
        data: body.data,
        message: body.message,
      };
    }
    return {
      success: false,
      data: null,
      message: body?.message || 'Reservist not found',
    };
  } catch (error) {
    const status = error.response?.status;
    if (status === 401) {
      return {
        success: false,
        data: null,
        message: 'You must be logged in to lookup your profile',
      };
    }
    if (status === 403) {
      return {
        success: false,
        data: null,
        message: 'Only reservists can use this feature',
      };
    }
    return {
      success: false,
      data: null,
      message: error.response?.data?.message || 'Failed to lookup reservist',
    };
  }
}

export async function publicLookupReservist(serial, name) {
  try {
    const params = {};
    if (serial) params.serial = serial;
    if (name) params.name = name;
    const response = await api.get('/reservists/public-lookup', { params });
    const body = response.data;
    return {
      success: body?.success ?? false,
      data: body?.data ?? null,
      message: body?.message || 'Reservist not found',
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      message: error.response?.data?.message || 'Failed to lookup reservist',
    };
  }
}
