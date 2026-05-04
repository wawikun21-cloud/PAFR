/**
 * Reservists Service
 * API calls for reservists CRUD operations
 */

import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

/**
 * Get reservists list with filters and pagination
 * @param {object} params - { page, limit, search, arsen_id, group_id, city_id, status, sortBy, sortOrder }
 */
export async function getReservists(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);
  if (params.arsen_id) queryParams.append('arsen_id', params.arsen_id);
  if (params.group_id) queryParams.append('group_id', params.group_id);
  if (params.city_id) queryParams.append('city_id', params.city_id);
  if (params.status) queryParams.append('status', params.status);
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  const queryString = queryParams.toString();
  const url = `/api/reservists${queryString ? '?' + queryString : ''}`;
  
  return apiGet(url);
}

/**
 * Get single reservist by ID
 * @param {string|number} id 
 */
export async function getReservistById(id) {
  return apiGet(`/api/reservists/${id}`);
}

/**
 * Create new reservist
 * @param {object} data - Reservist data
 */
export async function createReservist(data) {
  return apiPost('/api/reservists', data);
}

/**
 * Update reservist
 * @param {string|number} id 
 * @param {object} data 
 */
export async function updateReservist(id, data) {
  return apiPut(`/api/reservists/${id}`, data);
}

/**
 * Delete reservist
 * @param {string|number} id 
 */
export async function deleteReservist(id) {
  return apiDelete(`/api/reservists/${id}`);
}

/**
 * Get hierarchy data for dropdowns (Arsens, Groups, Cities)
 * Uses Promise.allSettled to handle partial failures
 * Returns { arsens: [], groups: [], cities: [] }
 */
export async function getHierarchyForDropdowns() {
  try {
    const results = await Promise.allSettled([
      apiGet('/api/arsens?limit=100'),
      apiGet('/api/groups?limit=100'),
      apiGet('/api/cities?limit=100')
    ]);
    
    // Extract data from fulfilled promises, use empty array for rejected ones
    const arsensRes = results[0].status === 'fulfilled' ? results[0].value : null;
    const groupsRes = results[1].status === 'fulfilled' ? results[1].value : null;
    const citiesRes = results[2].status === 'fulfilled' ? results[2].value : null;
    
    const arsens = arsensRes?.data?.arsens || [];
    const groups = groupsRes?.data?.groups || [];
    const cities = citiesRes?.data?.cities || [];
    
    console.log('Arsens data:', arsens);
    console.log('Groups data:', groups);
    console.log('Cities data:', cities);
    
    // Log any errors
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`API ${index === 0 ? 'arsens' : index === 1 ? 'groups' : 'cities'} failed:`, result.reason);
      }
    });
    
    return { arsens, groups, cities };
  } catch (error) {
    console.error('Error fetching hierarchy for dropdowns:', error);
    return { arsens: [], groups: [], cities: [] };
  }
}
