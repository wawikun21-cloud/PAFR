import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

// Services
import {
  getArsens, createArsen, updateArsen, deleteArsen,
  getGroups, createGroup, updateGroup, deleteGroup,
  getCities, createCity, updateCity, deleteCity
} from '@/services/hierarchyService';

// Components
import ArsenForm from '@/components/hierarchy/ArsenForm';
import GroupForm from '@/components/hierarchy/GroupForm';
import CityForm from '@/components/hierarchy/CityForm';

export default function Groups() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('groups');

  // Data states
  const [arsens, setArsens] = useState([]);
  const [groups, setGroups] = useState([]);
  const [cities, setCities] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(10);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedArsen, setSelectedArsen] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');

  // Modal states
  const [showArsenForm, setShowArsenForm] = useState(false);
  const [editingArsen, setEditingArsen] = useState(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [showCityForm, setShowCityForm] = useState(false);
  const [editingCity, setEditingCity] = useState(null);

  // Dropdown data
  const [arsensForFilter, setArsensForFilter] = useState([]);
  const [groupsForFilter, setGroupsForFilter] = useState([]);

  // Fetch data based on active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let params = { page, limit };

      if (activeTab === 'arsens') {
        const data = await getArsens(params);
        if (data.status === 'success') {
          setArsens(data.data?.arsens || []);
          setTotalCount(data.data?.pagination?.total || 0);
        }
      } else if (activeTab === 'groups') {
        if (search) params.search = search;
        if (selectedArsen) params.arsen_id = selectedArsen;
        const data = await getGroups(params);
        if (data.status === 'success') {
          setGroups(data.data?.groups || []);
          setTotalCount(data.data?.pagination?.total || 0);
        }
      } else if (activeTab === 'cities') {
        if (search) params.search = search;
        if (selectedGroup) params.group_id = selectedGroup;
        const data = await getCities(params);
        if (data.status === 'success') {
          setCities(data.data?.cities || []);
          setTotalCount(data.data?.pagination?.total || 0);
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, limit, search, selectedArsen, selectedGroup]);

  // Fetch filter dropdowns
  const fetchFilterData = async () => {
    try {
      const arsensData = await getArsens({ limit: 100 });
      if (arsensData.status === 'success') {
        setArsensForFilter(arsensData.data?.arsens || []);
      }
      const groupsData = await getGroups({ limit: 100 });
      if (groupsData.status === 'success') {
        setGroupsForFilter(groupsData.data?.groups || []);
      }
    } catch (err) {
      console.error('Failed to fetch filter data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchFilterData();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, search, selectedArsen, selectedGroup]);

  // Delete handlers
  const handleDeleteArsen = async (id) => {
    if (!confirm('Are you sure you want to delete this ARSEN?')) return;
    try {
      const data = await deleteArsen(id);
      if (data.status === 'success') {
        fetchData();
        fetchFilterData();
      } else {
        alert(data.message || 'Failed to delete ARSEN');
      }
    } catch {
      alert('Network error. Please try again.');
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    try {
      const data = await deleteGroup(id);
      if (data.status === 'success') {
        fetchData();
        fetchFilterData();
      } else {
        alert(data.message || 'Failed to delete group');
      }
    } catch {
      alert('Network error. Please try again.');
    }
  };

  const handleDeleteCity = async (id) => {
    if (!confirm('Are you sure you want to delete this city?')) return;
    try {
      const data = await deleteCity(id);
      if (data.status === 'success') {
        fetchData();
      } else {
        alert(data.message || 'Failed to delete city');
      }
    } catch {
      alert('Network error. Please try again.');
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  const tabs = [
    { id: 'arsens', label: 'ARSENs' },
    { id: 'groups', label: 'Groups' },
    { id: 'cities', label: 'Cities' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Groups & Units Management
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage military ARSENs, groups, and cities
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              if (activeTab === 'arsens') {
                setEditingArsen(null);
                setShowArsenForm(true);
              } else if (activeTab === 'groups') {
                setEditingGroup(null);
                setShowGroupForm(true);
              } else {
                setEditingCity(null);
                setShowCityForm(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add {activeTab === 'arsens' ? 'ARSEN' : activeTab === 'groups' ? 'Group' : 'City'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <nav className="flex gap-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearch('');
                setSelectedArsen('');
                setSelectedGroup('');
              }}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>

          {activeTab === 'groups' && (
            <select
              value={selectedArsen}
              onChange={(e) => setSelectedArsen(e.target.value)}
              className="px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            >
              <option value="">All ARSENs</option>
              {arsensForFilter.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}

          {activeTab === 'cities' && (
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            >
              <option value="">All Groups</option>
              {groupsForFilter.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* ARSENs Table */}
          {activeTab === 'arsens' && (
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Code</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Location</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {arsens.length === 0 ? (
                      <tr><td colSpan="5" className="px-4 py-12 text-center text-neutral-500">No ARSENs found</td></tr>
                    ) : (
                      arsens.map(a => (
                        <tr key={a.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                          <td className="px-4 py-3 text-sm font-medium">{a.code}</td>
                          <td className="px-4 py-3 text-sm">{a.name}</td>
                          <td className="px-4 py-3 text-sm">{a.location || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                              a.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            )}>{a.is_active ? 'Active' : 'Inactive'}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => { setEditingArsen(a); setShowArsenForm(true); }} className="p-1.5 text-neutral-500 hover:text-blue-600"><Edit size={14} /></button>
                              {isAdmin && <button onClick={() => handleDeleteArsen(a.id)} className="p-1.5 text-neutral-500 hover:text-red-600"><Trash2 size={14} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Groups Table */}
          {activeTab === 'groups' && (
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Code</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">ARSEN</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Commander</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {groups.length === 0 ? (
                      <tr><td colSpan="6" className="px-4 py-12 text-center text-neutral-500">No groups found</td></tr>
                    ) : (
                      groups.map(g => (
                        <tr key={g.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                          <td className="px-4 py-3 text-sm font-medium">{g.code || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">{g.name}</td>
                          <td className="px-4 py-3 text-sm">{g.arsen_name || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">{g.commander_name || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                              g.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            )}>{g.is_active ? 'Active' : 'Inactive'}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => { setEditingGroup(g); setShowGroupForm(true); }} className="p-1.5 text-neutral-500 hover:text-blue-600"><Edit size={14} /></button>
                              {isAdmin && <button onClick={() => handleDeleteGroup(g.id)} className="p-1.5 text-neutral-500 hover:text-red-600"><Trash2 size={14} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cities Table */}
          {activeTab === 'cities' && (
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Province</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Postal Code</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Group</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {cities.length === 0 ? (
                      <tr><td colSpan="6" className="px-4 py-12 text-center text-neutral-500">No cities found</td></tr>
                    ) : (
                      cities.map(c => (
                        <tr key={c.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                          <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                          <td className="px-4 py-3 text-sm">{c.province}</td>
                          <td className="px-4 py-3 text-sm">{c.postal_code || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">{c.group_name || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                              c.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            )}>{c.is_active ? 'Active' : 'Inactive'}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => { setEditingCity(c); setShowCityForm(true); }} className="p-1.5 text-neutral-500 hover:text-blue-600"><Edit size={14} /></button>
                              {isAdmin && <button onClick={() => handleDeleteCity(c.id)} className="p-1.5 text-neutral-500 hover:text-red-600"><Trash2 size={14} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalCount)} of {totalCount} {activeTab}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50">Previous</button>
                <span className="px-3 py-1.5 text-sm">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Form Modals */}
      {showArsenForm && (
        <ArsenForm
          arsen={editingArsen}
          onClose={() => { setShowArsenForm(false); setEditingArsen(null); }}
          onSubmit={() => { setShowArsenForm(false); setEditingArsen(null); fetchData(); fetchFilterData(); }}
        />
      )}

      {showGroupForm && (
        <GroupForm
          group={editingGroup}
          onClose={() => { setShowGroupForm(false); setEditingGroup(null); }}
          onSubmit={() => { setShowGroupForm(false); setEditingGroup(null); fetchData(); fetchFilterData(); }}
        />
      )}

      {showCityForm && (
        <CityForm
          city={editingCity}
          onClose={() => { setShowCityForm(false); setEditingCity(null); }}
          onSubmit={() => { setShowCityForm(false); setEditingCity(null); fetchData(); }}
        />
      )}
    </div>
  );
}
