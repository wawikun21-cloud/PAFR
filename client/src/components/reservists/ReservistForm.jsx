import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { createReservist, updateReservist, getReservistById } from '@/services/reservistsService';
import { getHierarchyForDropdowns } from '@/services/reservistsService';
import { cn } from '@/lib/utils';

/**
 * ReservistForm Modal
 * For creating or editing a reservist
 */
export default function ReservistForm({ reservist, onClose, onSubmit }) {
  const isEditMode = !!reservist;
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    rank: '',
    service_number: '',
    date_of_birth: '',
    phone_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    address: '',
    arsen_id: '',
    group_id: '',
    city_id: ''
  });
  
  const [groups, setGroups] = useState([]);
  const [cities, setCities] = useState([]);
  const [arsens, setArsens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch hierarchy data and reservist data if editing
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getHierarchyForDropdowns();
        setArsens(data.arsens || []);
        setGroups(data.groups || []);
        setCities(data.cities || []);
        
        if (isEditMode && reservist?.id) {
          const result = await getReservistById(reservist.id);
          if (result.status === 'success' && result.data) {
            const r = result.data;
            setFormData({
              email: r.email || '',
              password: '', // Don't populate password
              first_name: r.first_name || '',
              last_name: r.last_name || '',
              rank: r.rank || '',
              service_number: r.service_number || '',
              date_of_birth: r.date_of_birth ? r.date_of_birth.split('T')[0] : '',
              phone_number: r.phone_number || '',
              emergency_contact_name: r.emergency_contact_name || '',
              emergency_contact_phone: r.emergency_contact_phone || '',
              address: r.address || '',
              arsen_id: r.arsen_id || '',
              group_id: r.group_id || '',
              city_id: r.city_id || ''
            });
          }
        }
      } catch (err) {
        setError('Failed to load data');
      }
    };
    
    fetchData();
  }, [isEditMode, reservist]);

  // Filter groups by selected ARSEN
  const filteredGroups = formData.arsen_id 
    ? groups.filter(g => g.arsen_id == formData.arsen_id)
    : groups;
  
  // Filter cities by selected Group
  const filteredCities = formData.group_id
    ? cities.filter(c => c.group_id == formData.group_id)
    : cities;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Reset dependent fields when parent changes
      ...(name === 'arsen_id' ? { group_id: '', city_id: '' } : {}),
      ...(name === 'group_id' ? { city_id: '' } : {})
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.first_name || !formData.last_name || !formData.rank || !formData.service_number) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (!isEditMode && (!formData.email || !formData.password)) {
      setError('Email and password are required for new reservists');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        rank: formData.rank,
        service_number: formData.service_number,
        date_of_birth: formData.date_of_birth || undefined,
        phone_number: formData.phone_number || undefined,
        emergency_contact_name: formData.emergency_contact_name || undefined,
        emergency_contact_phone: formData.emergency_contact_phone || undefined,
        address: formData.address || undefined,
        group_id: formData.group_id || undefined,
        city_id: formData.city_id || undefined
      };

      // Only include password if provided (for new or password change)
      if (formData.password) {
        payload.password = formData.password;
      }

      let result;
      if (isEditMode) {
        result = await updateReservist(reservist.id, payload);
      } else {
        result = await createReservist(payload);
      }

      if (result.status === 'success') {
        onSubmit();
      } else {
        setError(result.message || 'Failed to save reservist');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {isEditMode ? 'Edit Reservist' : 'Add New Reservist'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* Row 1: Email & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email"
                required
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Password {isEditMode ? '(leave blank to keep)' : '*'}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={isEditMode ? 'Enter new password' : 'Enter password'}
                required={!isEditMode}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>
          </div>

          {/* Row 2: First Name & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Enter first name"
                required
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Enter last name"
                required
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>
          </div>

          {/* Row 3: Rank & Service Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Rank *
              </label>
              <input
                type="text"
                name="rank"
                value={formData.rank}
                onChange={handleChange}
                placeholder="Enter rank"
                required
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Service Number (ID Number) *
              </label>
              <input
                type="text"
                name="service_number"
                value={formData.service_number}
                onChange={handleChange}
                placeholder="Enter service number"
                required
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>
          </div>

          {/* Row 4: ARSEN & Group */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                ARSEN
              </label>
              <select
                name="arsen_id"
                value={formData.arsen_id}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              >
                <option value="">Select ARSEN</option>
                {arsens.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Group
              </label>
              <select
                name="group_id"
                value={formData.group_id}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              >
                <option value="">Select Group</option>
                {filteredGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: City & Date of Birth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                City
              </label>
              <select
                name="city_id"
                value={formData.city_id}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              >
                <option value="">Select City</option>
                {filteredCities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>
          </div>

          {/* Row 6: Phone & Emergency Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="Enter phone number"
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleChange}
                placeholder="Enter emergency contact"
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter address"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  {isEditMode ? 'Update' : 'Create'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
