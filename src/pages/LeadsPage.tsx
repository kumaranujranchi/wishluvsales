import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Doc, Id } from '../../convex/_generated/dataModel';
import { useDialog } from '../contexts/DialogContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { MultiSelect } from '../components/ui/MultiSelect';
import { KPICard } from '../components/ui/KPICard';
import { 
  Users, 
  Search, 
  Filter, 
  Calendar, 
  Plus, 
  RotateCcw, 
  ArrowUp, 
  ArrowDown, 
  Edit2, 
  Trash2, 
  UserCheck,
  Compass,
  Link
} from 'lucide-react';
import { LeadFormModal } from '../components/leads/LeadFormModal';
import { useUser } from '@clerk/clerk-react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface JoinedLead {
  lead: Doc<"leads">;
  project?: Doc<"projects">;
  assignedAgent?: Doc<"profiles">;
}

export function LeadsPage() {
  const { user } = useUser();
  const profile = useQuery(api.profiles.getByEmail, { email: user?.emailAddresses[0]?.emailAddress || '' });
  const dialog = useDialog();

  // Convex Hooks
  const leadsRaw = useQuery(api.leads.listAll);
  const projectsRaw = useQuery(api.projects.list);
  const profilesRaw = useQuery(api.profiles.list);
  const deleteLead = useMutation(api.leads.remove);
  const updateLead = useMutation(api.leads.update);

  const leads = useMemo(() => leadsRaw || [], [leadsRaw]);
  const projectsList = useMemo(() => projectsRaw || [], [projectsRaw]);
  const profilesList = useMemo(() => profilesRaw || [], [profilesRaw]);

  const [loading, setLoading] = useState(true);

  // RBAC Roles
  const isSalesExecutive = profile?.role === 'sales_executive';
  const isTeamLeader = profile?.role === 'team_leader';
  const isAdminOrCRM = ['super_admin', 'admin', 'crm', 'crm_admin', 'crm_executive', 'director'].includes(profile?.role || '');

  // Tracking loading state manually for Convex
  useEffect(() => {
    if (leadsRaw !== undefined && projectsRaw !== undefined && profilesRaw !== undefined) {
      setLoading(false);
    }
  }, [leadsRaw, projectsRaw, profilesRaw]);

  // --- Filtering & Sorting State ---
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const filterOptions = useMemo(() => ({
    projects: projectsList.map(p => ({ value: p._id, label: p.name })),
    executives: profilesList
      .filter(p => p.role === 'sales_executive' || p.role === 'team_leader')
      .map(p => ({ value: p._id, label: p.full_name }))
  }), [projectsList, profilesList]);

  const [filters, setFilters] = useState({
    executiveId: '',
    projectId: 'all',
    source: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const [sortConfig, setSortConfig] = useState({
    column: 'created_at',
    direction: 'desc' as 'asc' | 'desc'
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Doc<"leads"> | null>(null);

  const handleSort = (column: string) => {
    setSortConfig(current => ({
      column,
      direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      executiveId: '',
      projectId: 'all',
      source: 'all',
      status: 'all',
      dateFrom: '',
      dateTo: '',
    });
    setSearchQuery('');
  };

  // --- Local Join to Match Lead with Project and Profile details ---
  const joinedLeads = useMemo(() => {
    if (!leads.length) return [];
    
    return leads.map((lead) => {
      const project = projectsList.find(p => p._id === lead.project_id || p.supabase_id === lead.project_id);
      const assignedAgent = profilesList.find(p => p._id === lead.assigned_to || p.supabase_id === lead.assigned_to);
      
      return {
        lead,
        project,
        assignedAgent
      };
    });
  }, [leads, projectsList, profilesList]);

  // --- Filtering & Sorting ---
  const filteredData = useMemo(() => {
    return joinedLeads.filter(({ lead }) => {
      // RBAC check: Sales Executive sees only leads assigned to them
      if (isSalesExecutive) {
        if (lead.assigned_to !== profile?._id) return false;
      }

      // RBAC check: Team Leader sees only leads assigned to them or their team members
      if (isTeamLeader) {
        const tlId = profile?._id;
        const teamMemberIds = new Set(
          profilesList
            .filter((p: any) => p.reporting_manager_id === tlId || p._id === tlId)
            .map((p: any) => p._id)
        );
        if (!teamMemberIds.has(lead.assigned_to)) return false;
      }

      // Dropdown Filters
      if (filters.executiveId && lead.assigned_to !== filters.executiveId) return false;
      if (filters.projectId !== 'all' && lead.project_id !== filters.projectId) return false;
      if (filters.source !== 'all' && lead.source !== filters.source) return false;
      if (filters.status !== 'all' && lead.status !== filters.status) return false;
      if (filters.dateFrom && lead.created_at.slice(0, 10) < filters.dateFrom) return false;
      if (filters.dateTo && lead.created_at.slice(0, 10) > filters.dateTo) return false;

      // Search Query
      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        const match = lead.name.toLowerCase().includes(queryLower) ||
                      lead.phone.toLowerCase().includes(queryLower) ||
                      (lead.email || '').toLowerCase().includes(queryLower) ||
                      (lead.notes || '').toLowerCase().includes(queryLower);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      const col = sortConfig.column;
      let valA: any = '';
      let valB: any = '';

      if (col === 'created_at') {
        valA = a.lead.created_at;
        valB = b.lead.created_at;
      } else if (col === 'name') {
        valA = a.lead.name;
        valB = b.lead.name;
      } else if (col === 'status') {
        valA = a.lead.status;
        valB = b.lead.status;
      } else if (col === 'project') {
        valA = a.project?.name || '';
        valB = b.project?.name || '';
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [joinedLeads, profile, isSalesExecutive, isTeamLeader, filters, searchQuery, sortConfig, profilesList]);

  // --- Metrics ---
  const metrics = useMemo(() => {
    const total = filteredData.length;
    const pending = filteredData.filter(item => item.lead.status === 'pending').length;
    const contacted = filteredData.filter(item => item.lead.status === 'contacted').length;
    const converted = filteredData.filter(item => item.lead.status === 'converted').length;
    const conversionRate = total > 0 ? (converted / total) * 100 : 0;

    return {
      total,
      pending,
      contacted,
      converted,
      conversionRate
    };
  }, [filteredData]);

  // Actions
  const handleAssignNew = () => {
    setSelectedLead(null);
    setIsFormOpen(true);
  };

  const handleEdit = (lead: Doc<"leads">) => {
    setSelectedLead(lead);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: Id<"leads">) => {
    const confirmed = await dialog.confirm(
      'Are you sure you want to delete this lead? This action cannot be undone.', 
      {
        variant: 'danger',
        confirmText: 'Delete Lead',
        title: 'Delete Lead'
      }
    );

    if (!confirmed) return;

    try {
      await deleteLead({ id });
      await dialog.alert('Lead deleted successfully.', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting lead:', error);
      await dialog.alert('Failed to delete lead.', { variant: 'danger' });
    }
  };

  const handleStatusChange = async (leadId: Id<"leads">, newStatus: string) => {
    try {
      await updateLead({
        id: leadId,
        status: newStatus,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating status:', err);
      await dialog.alert('Failed to update lead status.', { variant: 'danger' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      case 'contacted':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'converted':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'lost':
        return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0A1C37] dark:text-white mb-1">Leads Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage, assign, and track lead status across the sales pipeline</p>
        </div>
        <div className="flex items-center gap-4">
          {isAdminOrCRM && (
            <Button variant="gradient" onClick={handleAssignNew} className="w-48 h-10 whitespace-nowrap">
              <Plus size={18} className="mr-2" />
              Assign New Lead
            </Button>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Leads"
          value={metrics.total}
          icon={Users}
          subtitle="Assigned Leads"
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <KPICard
          title="New / Pending"
          value={metrics.pending}
          icon={Calendar}
          subtitle="Awaiting Contact"
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
        />
        <KPICard
          title="Contacted"
          value={metrics.contacted}
          icon={UserCheck}
          subtitle="Leads Engaged"
          iconColor="text-indigo-600"
          iconBgColor="bg-indigo-100"
        />
        <KPICard
          title="Conversion Rate"
          value={`${metrics.conversionRate.toFixed(1)}%`}
          icon={Compass}
          subtitle="Leads Converted"
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
      </div>

      {/* Filters & Tables */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsFilterExpanded(!isFilterExpanded)}>
              <Filter size={20} className="text-[#1673FF]" />
              <CardTitle className="text-[#0A1C37] dark:text-white select-none">Lead Records</CardTitle>
              {isFilterExpanded ? <ChevronUp size={16} className="text-gray-400 dark:text-gray-500" /> : <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />}
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <Input
                placeholder="Search Name/Phone/Notes..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isFilterExpanded && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-fadeIn text-slate-900">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {!isSalesExecutive && (
                  <Select
                    label="Sales Executive"
                    value={filters.executiveId}
                    onChange={(e) => setFilters(prev => ({ ...prev, executiveId: e.target.value }))}
                    options={[{ value: '', label: 'All Executives' }, ...filterOptions.executives]}
                  />
                )}
                
                <Select
                  label="Project"
                  value={filters.projectId}
                  onChange={(e) => setFilters(prev => ({ ...prev, projectId: e.target.value }))}
                  options={[{ label: 'All Projects', value: 'all' }, ...projectsList.map(p => ({ label: p.name, value: p._id }))]}
                />

                <Select
                  label="Lead Source"
                  value={filters.source}
                  onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
                  options={[
                    { label: 'All Sources', value: 'all' },
                    { label: 'Referral', value: 'Referral' },
                    { label: '99acres', value: '99acres' },
                    { label: 'MagicBrick', value: 'MagicBrick' },
                    { label: 'Housing', value: 'Housing' },
                    { label: 'Meta', value: 'Meta' },
                    { label: 'Google', value: 'Google' },
                    { label: 'Walk-in', value: 'Walk-in' }
                  ]}
                />

                <Select
                  label="Lead Status"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  options={[
                    { label: 'All Statuses', value: 'all' },
                    { label: 'Pending / New', value: 'pending' },
                    { label: 'Contacted', value: 'contacted' },
                    { label: 'Converted', value: 'converted' },
                    { label: 'Lost', value: 'lost' }
                  ]}
                />

                <Input type="date" label="From Date" value={filters.dateFrom} onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))} />
                <Input type="date" label="To Date" value={filters.dateTo} onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))} />
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-gray-500 hover:text-red-500">
                  <RotateCcw size={14} className="mr-2" /> Clear All Filters
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner size="lg" className="min-h-[400px]" />
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 p-4 rounded-full inline-flex mb-4">
                <Search className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No leads found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-medium">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg cursor-pointer hover:bg-gray-100" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center gap-1">Assigned Date {sortConfig.column === 'created_at' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1">Lead Info {sortConfig.column === 'name' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('project')}>
                      <div className="flex items-center gap-1">Project {sortConfig.column === 'project' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                    </th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">Status {sortConfig.column === 'status' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                    </th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map(({ lead, project, assignedAgent }) => (
                    <tr key={lead._id} className="hover:bg-gray-50 transition-colors dark:hover:bg-white/5">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0A1C37] dark:text-white">{lead.name}</div>
                        <div className="text-xs text-gray-500">Ph: {lead.phone}</div>
                        {lead.email && <div className="text-xs text-gray-400">{lead.email}</div>}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-300">
                        {project?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400 capitalize">
                        {lead.source}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300 font-medium">
                        {assignedAgent?.full_name || <span className="text-gray-400 italic">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                          className={`px-2.5 py-1 text-xs rounded-full font-semibold border-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${getStatusBadge(lead.status)}`}
                        >
                          <option className="bg-white text-black" value="pending">Pending / New</option>
                          <option className="bg-white text-black" value="contacted">Contacted</option>
                          <option className="bg-white text-black" value="converted">Converted</option>
                          <option className="bg-white text-black" value="lost">Lost</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAdminOrCRM && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleEdit(lead)} title="Edit Lead">
                                <Edit2 size={14} />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-500 border-red-200" onClick={() => handleDelete(lead._id)} title="Delete Lead">
                                <Trash2 size={14} />
                              </Button>
                            </>
                          )}
                          {!isAdminOrCRM && lead.notes && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => dialog.alert(`Lead Notes:\n${lead.notes}`, { title: `${lead.name}'s Notes` })} 
                              title="View Notes"
                            >
                              Notes
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <LeadFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {}}
        editingLead={selectedLead}
      />
    </div>
  );
}
