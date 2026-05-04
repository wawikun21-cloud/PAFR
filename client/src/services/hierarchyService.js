/**
 * Hierarchy Service
 * API calls for ARSEN, Group, and City management
 */

import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

// ==================== ARSENs ====================

export async function getArsens(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);
  
  const url = `/api/arsens${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return apiGet(url);
}

export async function getArsenById(id) {
  return apiGet(`/api/arsens/${id}`);
}

export async function createArsen(data) {
  return apiPost('/api/arsens', data);
}

export async function updateArsen(id, data) {
  return apiPut(`/api/arsens/${id}`, data);
}

export async function deleteArsen(id) {
  return apiDelete(`/api/arsens/${id}`);
}

// ==================== Groups ====================

export async function getGroups(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.arsen_id) queryParams.append('arsen_id', params.arsen_id);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  
  const url = `/api/groups${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return apiGet(url);
}

export async function getGroupById(id) {
  return apiGet(`/api/groups/${id}`);
}

export async function createGroup(data) {
  return apiPost('/api/groups', data);
}

export async function updateGroup(id, data) {
  return apiPut(`/api/groups/${id}`, data);
}

export async function deleteGroup(id) {
  return apiDelete(`/api/groups/${id}`);
}

// ==================== Cities ====================

export async function getCities(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.group_id) queryParams.append('group_id', params.group_id);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  
  const url = `/api/cities${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return apiGet(url);
}

export async function getCityById(id) {
  return apiGet(`/api/cities/${id}`);
}

export async function createCity(data) {
  return apiPost('/api/cities', data);
}

export async function updateCity(id, data) {
  return apiPut(`/api/cities/${id}`, data);
}

export async function deleteCity(id) {
  return apiDelete(`/api/cities/${id}`);
}
