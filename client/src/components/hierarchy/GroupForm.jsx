import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { createGroup, updateGroup, getArsens } from '@/services/hierarchyService';

export default function GroupForm({ group, onClose, onSubmit }) {
  const isEditMode = !!group;
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    arsen_id: '',
    commander_name: '',
    is_active: true
  });
  const [arsens, setArsens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchArsens = async () => {
      try {
        const data = await getArsens({ limit: 100 });
        if (data.status === 'success') {
          setArsens(data.data?.arsens || []);
        }
      } catch (err) {
        console.error('Failed to fetch arsens:', err);
      }
    };
    fetchArsens();

    if (isEditMode && group) {
      setFormData({
        code: group.code || '',
        name: group.name || '',
        arsen_id: group.arsen_id || '',
        commander_name: group.commander_name || '',
        is_active: group.is_active !== false
      });
    }
  }, [isEditMode, group]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.code || !formData.name || !formData.arsen_id) {
      setError('Code, name, and ARSEN are required');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        arsen_id: formData.arsen_id,
        commander_name: formData.commander_name || undefined,
        is_active: formData.is_active
      };

      let result;
      if (isEditMode) {
        result = await updateGroup(group.id, payload);
      } else {
        result = await createGroup(payload);
      }

      if (result.status === 'success') {
        onSubmit();
      } else {
        setError(result.message || 'Failed to save group');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {isEditMode ? 'Edit Group' : 'Add New Group'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Code *
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="Enter group code"
              required
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter group name"
              required
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              ARSEN *
            </label>
            <select
              name="arsen_id"
              value={formData.arsen_id}
              onChange={handleChange}
              required
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
              Commander Name
            </label>
            <input
              type="text"
              name="commander_name"
              value={formData.commander_name}
              onChange={handleChange}
              placeholder="Enter commander name"
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              id="group-active"
              className="rounded border-neutral-300 dark:border-neutral-600"
            />
            <label htmlFor="group-active" className="text-sm text-neutral-700 dark:text-neutral-300">
              Active
            </label>
          </div>

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
