import { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../utils/format';
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
import { TrendingUp, Plus, Wallet, Search, Filter, Calendar, DollarSign, Layers, PieChart, Eye, ChevronDown, ChevronUp, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react';
import { SalesFormModal } from '../components/sales/SalesFormModal';
import { PaymentManager } from '../components/sales/PaymentManager';
import { SalesDetailsModal } from '../components/sales/SalesDetailsModal';
import { SalesCancellationModal } from '../components/sales/SalesCancellationModal';
import { 
  startOfYear, 
  isAfter, 
  isSameMonth, 
  format,
  parseISO,
  startOfMonth,
  endOfMonth
} from 'date-fns';
import { useUser } from '@clerk/clerk-react';

import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function SalesPage() {
  const { user } = useUser();
  const profile = useQuery(api.profiles.getByEmail, { email: user?.emailAddresses[0]?.emailAddress || '' });
  const dialog = useDialog();

  // Convex Hooks
  const salesRaw = useQuery(api.sales.list);
  const paymentsRaw = useQuery(api.payments.listAll);
  const projectsListRaw = useQuery(api.projects.list);
  const profilesListRaw = useQuery(api.profiles.list);
  const customersListRaw = useQuery(api.customers.listAll);
  const deleteSale = useMutation(api.sales.remove);

  const sales = useMemo(() => salesRaw || [], [salesRaw]);
  const payments = useMemo(() => paymentsRaw || [], [paymentsRaw]);
  const projectsList = useMemo(() => projectsListRaw || [], [projectsListRaw]);
  const profilesList = useMemo(() => profilesListRaw || [], [profilesListRaw]);
  const customersList = useMemo(() => customersListRaw || [], [customersListRaw]);

  const [loading, setLoading] = useState(true);

  // RBAC Roles
  const isSalesExecutive = profile?.role === 'sales_executive';
  const isTeamLeader = profile?.role === 'team_leader';
  const isAdminOrCRM = ['super_admin', 'admin', 'crm', 'crm_admin', 'crm_executive'].includes(profile?.role || '');
  const canEdit = !isSalesExecutive && !isTeamLeader && profile?.role !== 'director';

  // Tracking loading state manually for Convex since it returns undefined initially
  useEffect(() => {
    if (salesRaw !== undefined && paymentsRaw !== undefined && projectsListRaw !== undefined && profilesListRaw !== undefined && customersListRaw !== undefined) {
      setLoading(false);
    }
  }, [salesRaw, paymentsRaw, projectsListRaw, profilesListRaw, customersListRaw]);

  // --- Advanced Filtering & Sorting State ---
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  const filterOptions = useMemo(() => ({
    projects: projectsList.map(p => ({ value: p._id, label: p.name })),
    executives: profilesList.filter(p => p.role === 'sales_executive' || p.role === 'team_leader').map(p => ({ value: p._id, label: p.full_name })),
    teamLeaders: profilesList.filter(p => p.role === 'team_leader' || p.role === 'super_admin' || p.role === 'admin').map(p => ({ value: p._id, label: p.full_name }))
  }), [projectsList, profilesList]);

  const [filters, setFilters] = useState({
    executiveId: '',
    teamLeaderId: '',
    dateFrom: '',
    dateTo: '',
    projectIds: [] as string[],
    isRegistryDone: 'all' as 'all' | 'yes' | 'no',
    isAgreementDone: 'all' as 'all' | 'yes' | 'no',
    status: 'all' as 'all' | 'booked' | 'cancelled',
  });

  const [sortConfig, setSortConfig] = useState({
    column: 'sale_date',
    direction: 'desc' as 'asc' | 'desc',
    foreignTable: null as string | null
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Doc<"sales"> | null>(null);

  const handleSort = (column: string, foreignTable: string | null = null) => {
    setSortConfig(current => ({
      column,
      foreignTable,
      direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDelete = async (id: Id<"sales">) => {
    const confirmed = await dialog.confirm('Are you sure you want to delete this sales record? This will also delete all associated payments.', {
      variant: 'danger',
      confirmText: 'Delete Record',
      title: 'Delete Sale'
    });

    if (!confirmed) return;

    try {
      await deleteSale({ id });
      await dialog.alert('Sale record deleted.', { variant: 'success', title: 'Deleted' });
    } catch (error) {
      console.error('Error deleting sale:', error);
      await dialog.alert('Failed to delete sale record.', { variant: 'danger', title: 'Error' });
    }
  };

  const handleQuickTimeFilter = (value: string) => {
    setTimeFilter(value);
    const now = new Date();
    let from = '';
    let to = '';

    if (value === 'this_month') {
      from = format(startOfMonth(now), 'yyyy-MM-dd');
      to = format(endOfMonth(now), 'yyyy-MM-dd');
    } else if (value === 'this_year') {
      from = format(startOfYear(now), 'yyyy-MM-dd');
      to = format(endOfMonth(now), 'yyyy-MM-dd');
    }
    setFilters(prev => ({ ...prev, dateFrom: from, dateTo: to }));
  };

  const clearAllFilters = () => {
    setFilters({
      executiveId: '',
      teamLeaderId: '',
      dateFrom: '',
      dateTo: '',
      projectIds: [] as string[],
      isRegistryDone: 'all',
      isAgreementDone: 'all' as 'all' | 'yes' | 'no',
      status: 'all' as 'all' | 'booked' | 'cancelled',
    });
    setSearchQuery('');
    setTimeFilter('all');
  };

  const mappedSaleForModal = useMemo(() => {
    if (!selectedSale) return null;
    return {
      ...selectedSale,
      customer: customersList.find((c: Doc<"customers">) => c._id === selectedSale.customer_id || c.supabase_id === selectedSale.customer_id),
      project: projectsList.find((p: Doc<"projects">) => p._id === selectedSale.project_id || p.supabase_id === selectedSale.project_id),
      executive: profilesList.find((p: Doc<"profiles">) => p._id === selectedSale.sales_executive_id || p.supabase_id === selectedSale.sales_executive_id)
    };
  }, [selectedSale, customersList, projectsList, profilesList]);

  // --- Filtering & Metrics Logic ---
  const filteredData = useMemo(() => {
    return sales.filter((sale: Doc<"sales">) => {
      // RBAC check
      if (isSalesExecutive) {
        const profileId = profile?._id || profile?.supabase_id;
        if (sale.sales_executive_id !== profileId) return false;
      }

      // Status/Metric Filters
      if (filters.status !== 'all' && (sale.metadata as any)?.booking_status !== filters.status) return false;
      if (filters.executiveId && sale.sales_executive_id !== filters.executiveId) return false;
      if (filters.projectIds.length > 0 && !filters.projectIds.includes(sale.project_id)) return false;
      if (filters.dateFrom && sale.sale_date < filters.dateFrom) return false;
      if (filters.dateTo && sale.sale_date > filters.dateTo) return false;
      if (filters.isRegistryDone !== 'all' && sale.is_registry_done !== (filters.isRegistryDone === 'yes')) return false;
      if (filters.isAgreementDone !== 'all' && sale.is_agreement_done !== (filters.isAgreementDone === 'yes')) return false;

      // Search
      const queryLower = searchQuery.toLowerCase();
      if (searchQuery) {
        const customer = customersList.find((c: any) => c._id === sale.customer_id || c.supabase_id === sale.customer_id);
        const customerName = customer?.name || '';
        const match = sale.unit_number?.toLowerCase().includes(queryLower) || 
                      sale.sale_number.toLowerCase().includes(queryLower) ||
                      customerName.toLowerCase().includes(queryLower);
        if (!match) return false;
      }

      return true;
    }).sort((a: Doc<"sales">, b: Doc<"sales">) => {
        // Basic sorting
        const col = sortConfig.column as keyof Doc<"sales">;
        const valA = a[col] ?? '';
        const valB = b[col] ?? '';
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [sales, profile, isSalesExecutive, filters, searchQuery, sortConfig]);

  // Metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const currentYearStart = startOfYear(now);

    const activeData = filteredData.filter((s: Doc<"sales">) => (s.metadata as Record<string, any>)?.booking_status !== 'cancelled');
    const totalSalesCount = activeData.length;

    const thisMonthSalesCount = sales.filter((s: Doc<"sales">) => {
      const saleDate = parseISO(s.sale_date);
      return isSameMonth(saleDate, now) && (s.metadata as Record<string, any>)?.booking_status !== 'cancelled';
    }).length;

    const totalArea = activeData.reduce((sum: number, s: Doc<"sales">) => sum + (Number(s.area_sqft) || 0), 0);
    const totalRevenue = activeData.reduce((sum: number, s: Doc<"sales">) => sum + (Number(s.total_revenue) || 0), 0);

    const totalReceivedYTD = payments
      .filter((p: Doc<"payments">) => {
        const pDate = parseISO(p.payment_date);
        return isAfter(pDate, currentYearStart) || p.payment_date === format(currentYearStart, 'yyyy-MM-dd');
      })
      .reduce((sum: number, p: Doc<"payments">) => sum + (Number(p.amount) || 0), 0);

    const totalReceivedThisMonth = payments
      .filter((p: Doc<"payments">) => isSameMonth(parseISO(p.payment_date), now))
      .reduce((sum: number, p: Doc<"payments">) => sum + (Number(p.amount) || 0), 0);

    return {
      totalSalesCount,
      thisMonthSalesCount,
      totalArea,
      totalRevenue,
      totalReceivedYTD,
      totalReceivedThisMonth
    };
  }, [sales, payments, filteredData]);


  const openEditModal = (sale: Doc<"sales">) => {
    setSelectedSale(sale);
    setIsFormOpen(true);
  };

  const openPaymentModal = (sale: Doc<"sales">) => {
    setSelectedSale(sale);
    setIsPaymentOpen(true);
  };

  const openDetailModal = (sale: Doc<"sales">) => {
    setSelectedSale(sale);
    setIsDetailOpen(true);
  };

  const openCancelModal = (sale: Doc<"sales">) => {
    setSelectedSale(sale);
    setIsCancelOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedSale(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0A1C37] dark:text-white mb-1">Sales Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Overview of performance and sales activities</p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={timeFilter}
            onChange={(e) => handleQuickTimeFilter(e.target.value)}
            options={[
              { label: 'This Month', value: 'this_month' },
              { label: 'This Year', value: 'this_year' },
              { label: 'All Time', value: 'all' },
            ]}
            className="w-40 h-10"
          />
          {canEdit && (
            <Button variant="gradient" onClick={handleCreateNew} className="w-48 h-10 whitespace-nowrap">
              <Plus size={18} className="mr-2" />
              New Sale
            </Button>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="space-y-3 md:space-y-4">
        <div className="grid grid-cols-2 gap-2 md:gap-4">
          <KPICard
            title="Total Sales"
            value={metrics.totalSalesCount}
            icon={Layers}
            subtitle={timeFilter.replace('_', ' ')}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
          />
          <KPICard
            title="This Month"
            value={metrics.thisMonthSalesCount}
            icon={Calendar}
            subtitle="New Bookings"
            iconColor="text-indigo-600"
            iconBgColor="bg-indigo-100"
          />
        </div>

        <div className={`grid gap-2 md:gap-4 ${isAdminOrCRM ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3'}`}>
          <KPICard
            title="Total Area"
            value={metrics.totalArea.toLocaleString()}
            icon={PieChart}
            subtitle="Sq. Ft. Sold"
            iconColor="text-orange-600"
            iconBgColor="bg-orange-100"
          />
          <KPICard
            title="Revenue"
            value={formatCurrency(metrics.totalRevenue, true)}
            icon={TrendingUp}
            subtitle="Total Value"
            formatter={(val) => val as string}
            iconColor="text-green-600"
            iconBgColor="bg-green-100"
          />
          <KPICard
            title="Received"
            value={formatCurrency(metrics.totalReceivedYTD, true)}
            icon={DollarSign}
            subtitle="Collections (YTD)"
            formatter={(val) => val as string}
            iconColor="text-emerald-600"
            iconBgColor="bg-emerald-100"
          />
          {isAdminOrCRM && (
            <KPICard
              title="Collection (Month)"
              value={formatCurrency(metrics.totalReceivedThisMonth, true)}
              icon={Wallet}
              subtitle="This Month"
              formatter={(val) => val as string}
              iconColor="text-teal-600"
              iconBgColor="bg-teal-100"
            />
          )}
        </div>
      </div>

      {/* Search & List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
             <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsFilterExpanded(!isFilterExpanded)}>
              <Filter size={20} className="text-[#1673FF]" />
              <CardTitle className="text-[#0A1C37] dark:text-white select-none">Sales Records</CardTitle>
              {isFilterExpanded ? <ChevronUp size={16} className="text-gray-400 dark:text-gray-500" /> : <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />}
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <Input
                placeholder="Search Customer/Unit..."
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
                {!isSalesExecutive && !isTeamLeader && (
                  <Select
                    label="Team Leader"
                    value={filters.teamLeaderId}
                    onChange={(e) => setFilters(prev => ({ ...prev, teamLeaderId: e.target.value }))}
                    options={[{ value: '', label: 'All Team Leads' }, ...filterOptions.teamLeaders]}
                  />
                )}
                <MultiSelect
                  label="Select Projects"
                  options={filterOptions.projects}
                  value={filters.projectIds}
                  onChange={(val) => setFilters(prev => ({ ...prev, projectIds: val }))}
                  placeholder="All Projects"
                />

                <Input type="date" label="From Date" value={filters.dateFrom} onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))} />
                <Input type="date" label="To Date" value={filters.dateTo} onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))} />

                <Select
                  label="Registry Status"
                  value={filters.isRegistryDone}
                  onChange={(e) => setFilters(prev => ({ ...prev, isRegistryDone: e.target.value as any }))}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'yes', label: 'Done' },
                    { value: 'no', label: 'Pending' }
                  ]}
                />
                <Select
                  label="Agreement Status"
                  value={filters.isAgreementDone}
                  onChange={(e) => setFilters(prev => ({ ...prev, isAgreementDone: e.target.value as any }))}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'yes', label: 'Done' },
                    { value: 'no', label: 'Pending' }
                  ]}
                />
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
              <h3 className="text-lg font-medium text-gray-900">No records found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-medium">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg cursor-pointer hover:bg-gray-100" onClick={() => handleSort('sale_date')}>
                      <div className="flex items-center gap-1">Date {sortConfig.column === 'sale_date' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                    </th>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Project & Unit</th>
                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('total_revenue')}>
                      <div className="flex items-center justify-end gap-1">Total Revenue {sortConfig.column === 'total_revenue' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                    </th>
                    <th className="px-4 py-3 text-center">Legal Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map((sale) => (
                    <tr key={sale._id} className={`hover:bg-gray-50 transition-colors dark:hover:bg-white/5 ${(sale.metadata as any)?.booking_status === 'cancelled' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {new Date(sale.sale_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#0A1C37] dark:text-gray-200">
                        {(() => {
                          const customer = customersList.find((c: any) => c._id === sale.customer_id || c.supabase_id === sale.customer_id);
                          return customer?.name || <span className="text-gray-400 text-xs">N/A</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 dark:text-gray-300">
                            {projectsList.find(p => p._id === sale.project_id || p.supabase_id === sale.project_id)?.name || 'Unknown Project'}
                        </div>
                        <div className="text-xs text-gray-500">Unit: {sale.unit_number || 'N/A'}</div>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${(sale.metadata as any)?.booking_status === 'cancelled' ? 'text-gray-400 line-through' : 'text-[#2BA67A]'}`}>
                        {formatCurrency(sale.total_revenue || 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {sale.is_agreement_done && <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Agreement</span>}
                          {sale.is_registry_done && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Registry</span>}
                          {!sale.is_agreement_done && !sale.is_registry_done && <span className="text-xs text-gray-400">Pending</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openDetailModal(sale)} title="View Details">
                            <Eye size={16} />
                          </Button>
                          {canEdit && (sale.metadata as any)?.booking_status !== 'cancelled' && (
                            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200" onClick={() => openPaymentModal(sale)} title="Manage Payments">
                              <Wallet size={16} />
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

      <SalesFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {}}
        editingSale={selectedSale}
      />

      <PaymentManager
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        sale={selectedSale}
      />

      <SalesDetailsModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        sale={mappedSaleForModal}
        onCancel={openCancelModal}
        onEdit={openEditModal}
        onDelete={(id) => handleDelete(id)}
        canEdit={canEdit}
      />

      <SalesCancellationModal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onSuccess={() => {}}
        sale={mappedSaleForModal}
      />
    </div>
  );
}
