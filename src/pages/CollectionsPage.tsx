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
import { 
  TrendingUp, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  Layers, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  ArrowUp, 
  ArrowDown, 
  Wallet 
} from 'lucide-react';
import { PaymentManager } from '../components/sales/PaymentManager';
import { SalesDetailsModal } from '../components/sales/SalesDetailsModal';
import { SalesCancellationModal } from '../components/sales/SalesCancellationModal';
import { SalesFormModal } from '../components/sales/SalesFormModal';
import { 
  startOfYear, 
  isSameMonth, 
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  isAfter
} from 'date-fns';
import { useUser } from '@clerk/clerk-react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface MatchedPayment {
  payment: Doc<"payments">;
  sale: Doc<"sales">;
  customer?: Doc<"customers">;
  project?: Doc<"projects">;
  executive?: Doc<"profiles">;
}

export function CollectionsPage() {
  const { user } = useUser();
  const profile = useQuery(api.profiles.getByEmail, { email: user?.emailAddresses[0]?.emailAddress || '' });
  const dialog = useDialog();

  // Convex Hooks
  const paymentsRaw = useQuery(api.payments.listAll);
  const salesRaw = useQuery(api.sales.list);
  const projectsListRaw = useQuery(api.projects.list);
  const profilesListRaw = useQuery(api.profiles.list);
  const customersListRaw = useQuery(api.customers.listAll);
  const deleteSale = useMutation(api.sales.remove);

  const payments = useMemo(() => paymentsRaw || [], [paymentsRaw]);
  const sales = useMemo(() => salesRaw || [], [salesRaw]);
  const projectsList = useMemo(() => projectsListRaw || [], [projectsListRaw]);
  const profilesList = useMemo(() => profilesListRaw || [], [profilesListRaw]);
  const customersList = useMemo(() => customersListRaw || [], [customersListRaw]);

  const [loading, setLoading] = useState(true);

  // RBAC Roles
  const isSalesExecutive = profile?.role === 'sales_executive';
  const isTeamLeader = profile?.role === 'team_leader';
  const canEdit = !isSalesExecutive && !isTeamLeader && profile?.role !== 'director';

  // Tracking loading state manually for Convex since it returns undefined initially
  useEffect(() => {
    if (
      paymentsRaw !== undefined && 
      salesRaw !== undefined && 
      projectsListRaw !== undefined && 
      profilesListRaw !== undefined && 
      customersListRaw !== undefined
    ) {
      setLoading(false);
    }
  }, [paymentsRaw, salesRaw, projectsListRaw, profilesListRaw, customersListRaw]);

  // --- Advanced Filtering & Sorting State ---
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const filterOptions = useMemo(() => ({
    projects: projectsList.map(p => ({ value: p._id, label: p.name })),
    executives: profilesList
      .filter(p => p.role === 'sales_executive' || p.role === 'team_leader')
      .map(p => ({ value: p._id, label: p.full_name })),
    teamLeaders: profilesList
      .filter(p => p.role === 'team_leader' || p.role === 'super_admin' || p.role === 'admin')
      .map(p => ({ value: p._id, label: p.full_name }))
  }), [projectsList, profilesList]);

  const [filters, setFilters] = useState({
    executiveId: '',
    teamLeaderId: '',
    dateFrom: '',
    dateTo: '',
    projectIds: [] as string[],
    paymentType: 'all',
    paymentMode: 'all',
  });

  const [sortConfig, setSortConfig] = useState({
    column: 'payment_date',
    direction: 'desc' as 'asc' | 'desc'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');

  // Modal States
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Doc<"sales"> | null>(null);

  const handleSort = (column: string) => {
    setSortConfig(current => ({
      column,
      direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc'
    }));
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
      paymentType: 'all',
      paymentMode: 'all',
    });
    setSearchQuery('');
    setTimeFilter('all');
  };

  // --- Local Join to Match Payment with Sales details ---
  const matchedPayments = useMemo(() => {
    if (!payments.length || !sales.length) return [];
    
    return payments.map((payment) => {
      const sale = sales.find(s => s._id === payment.sale_id || s.supabase_id === payment.sale_id);
      if (!sale) return null;
      
      const customer = customersList.find(c => c._id === sale.customer_id || c.supabase_id === sale.customer_id);
      const project = projectsList.find(p => p._id === sale.project_id || p.supabase_id === sale.project_id);
      const executive = profilesList.find(p => p._id === sale.sales_executive_id || p.supabase_id === sale.sales_executive_id);
      
      return {
        payment,
        sale,
        customer,
        project,
        executive
      };
    }).filter(Boolean) as MatchedPayment[];
  }, [payments, sales, customersList, projectsList, profilesList]);

  // --- Filtering & Sorting ---
  const filteredData = useMemo(() => {
    return matchedPayments.filter(({ payment, sale, customer }) => {
      // RBAC check: Sales Executive sees only own sales' payments
      if (isSalesExecutive) {
        if (sale.sales_executive_id !== profile?._id) return false;
      }

      // RBAC check: Team Leader sees only their team's sales' payments
      if (isTeamLeader) {
        const tlId = profile?._id;
        const teamMemberIds = new Set(
          profilesList
            .filter((p: any) => p.reporting_manager_id === tlId || p._id === tlId)
            .map((p: any) => p._id)
        );
        if (!teamMemberIds.has(sale.sales_executive_id)) return false;
      }

      // Filters
      if (filters.executiveId && sale.sales_executive_id !== filters.executiveId) return false;
      
      if (filters.teamLeaderId) {
        const tlId = filters.teamLeaderId;
        const teamMemberIds = new Set(
          profilesList
            .filter((p: any) => p.reporting_manager_id === tlId || p._id === tlId)
            .map((p: any) => p._id)
        );
        if (!teamMemberIds.has(sale.sales_executive_id)) return false;
      }

      if (filters.projectIds.length > 0 && !filters.projectIds.includes(sale.project_id)) return false;
      if (filters.dateFrom && payment.payment_date < filters.dateFrom) return false;
      if (filters.dateTo && payment.payment_date > filters.dateTo) return false;
      if (filters.paymentType !== 'all' && payment.payment_type !== filters.paymentType) return false;
      if (filters.paymentMode !== 'all' && payment.payment_mode !== filters.paymentMode) return false;

      // Search Query (Customer Name, Unit, Remarks/Txn Reference)
      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        const customerName = customer?.name || '';
        const unitNumber = sale.unit_number || '';
        const remarks = payment.remarks || '';
        const match = customerName.toLowerCase().includes(queryLower) ||
                      unitNumber.toLowerCase().includes(queryLower) ||
                      remarks.toLowerCase().includes(queryLower);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      const col = sortConfig.column;
      let valA: any = '';
      let valB: any = '';

      if (col === 'payment_date') {
        valA = a.payment.payment_date;
        valB = b.payment.payment_date;
      } else if (col === 'amount') {
        valA = a.payment.amount;
        valB = b.payment.amount;
      } else if (col === 'customer') {
        valA = a.customer?.name || '';
        valB = b.customer?.name || '';
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
  }, [matchedPayments, profile, isSalesExecutive, isTeamLeader, filters, searchQuery, sortConfig, profilesList]);

  // --- Metrics ---
  const metrics = useMemo(() => {
    const totalCollections = filteredData.reduce((sum, item) => sum + (item.payment.amount || 0), 0);
    const count = filteredData.length;
    const avgAmount = count > 0 ? totalCollections / count : 0;

    const now = new Date();
    const thisMonthCollections = filteredData
      .filter(item => isSameMonth(parseISO(item.payment.payment_date), now))
      .reduce((sum, item) => sum + (item.payment.amount || 0), 0);

    const currentYearStart = startOfYear(now);
    const thisYearCollections = filteredData
      .filter(item => {
        const pDate = parseISO(item.payment.payment_date);
        return isAfter(pDate, currentYearStart) || item.payment.payment_date === format(currentYearStart, 'yyyy-MM-dd');
      })
      .reduce((sum, item) => sum + (item.payment.amount || 0), 0);

    return {
      totalCollections,
      count,
      avgAmount,
      thisMonthCollections,
      thisYearCollections
    };
  }, [filteredData]);

  // Modal Actions
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

  const openEditModal = (sale: Doc<"sales">) => {
    setSelectedSale(sale);
    setIsFormOpen(true);
  };

  const handleDeleteSale = async (id: Id<"sales">) => {
    const confirmed = await dialog.confirm(
      'Are you sure you want to delete this sales record? This will also delete all associated payments.', 
      {
        variant: 'danger',
        confirmText: 'Delete Record',
        title: 'Delete Sale'
      }
    );

    if (!confirmed) return;

    try {
      await deleteSale({ id });
      await dialog.alert('Sale record deleted.', { variant: 'success', title: 'Deleted' });
    } catch (error) {
      console.error('Error deleting sale:', error);
      await dialog.alert('Failed to delete sale record.', { variant: 'danger', title: 'Error' });
    }
  };

  const mappedSaleForModal = useMemo(() => {
    if (!selectedSale) return null;
    return {
      ...selectedSale,
      customer: customersList.find(c => c._id === selectedSale.customer_id || c.supabase_id === selectedSale.customer_id),
      project: projectsList.find(p => p._id === selectedSale.project_id || p.supabase_id === selectedSale.project_id),
      executive: profilesList.find(p => p._id === selectedSale.sales_executive_id || p.supabase_id === selectedSale.sales_executive_id)
    };
  }, [selectedSale, customersList, projectsList, profilesList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0A1C37] dark:text-white mb-1">Collections Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Overview of all captured payments and collection metrics</p>
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
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Collections"
          value={formatCurrency(metrics.totalCollections, true)}
          icon={DollarSign}
          subtitle="Total Collected"
          formatter={(val) => val as string}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <KPICard
          title="This Month"
          value={formatCurrency(metrics.thisMonthCollections, true)}
          icon={Calendar}
          subtitle="New Collections"
          formatter={(val) => val as string}
          iconColor="text-indigo-600"
          iconBgColor="bg-indigo-100"
        />
        <KPICard
          title="This Year"
          value={formatCurrency(metrics.thisYearCollections, true)}
          icon={Wallet}
          subtitle="YTD Collections"
          formatter={(val) => val as string}
          iconColor="text-teal-600"
          iconBgColor="bg-teal-100"
        />
        <KPICard
          title="Payments Count"
          value={metrics.count}
          icon={Layers}
          subtitle="Total Payments"
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <KPICard
          title="Average Payment"
          value={formatCurrency(metrics.avgAmount, true)}
          icon={TrendingUp}
          subtitle="Per Transaction"
          formatter={(val) => val as string}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
        />
      </div>

      {/* Filter and Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsFilterExpanded(!isFilterExpanded)}>
              <Filter size={20} className="text-[#1673FF]" />
              <CardTitle className="text-[#0A1C37] dark:text-white select-none">Collection Records</CardTitle>
              {isFilterExpanded ? <ChevronUp size={16} className="text-gray-400 dark:text-gray-500" /> : <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />}
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <Input
                placeholder="Search Customer/Unit/Ref..."
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

                <Select
                  label="Payment Type"
                  value={filters.paymentType}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentType: e.target.value }))}
                  options={[
                    { label: 'All Types', value: 'all' },
                    { label: 'EMI', value: 'emi' },
                    { label: 'Advance', value: 'advance' },
                    { label: 'Booking', value: 'booking' },
                    { label: 'Token', value: 'token' },
                    { label: 'Loan Disbursment', value: 'loan_disbursement' },
                  ]}
                />

                <Select
                  label="Payment Mode"
                  value={filters.paymentMode}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentMode: e.target.value }))}
                  options={[
                    { label: 'All Modes', value: 'all' },
                    { label: 'Cash', value: 'cash' },
                    { label: 'Cheque', value: 'cheque' },
                    { label: 'Account Transfer', value: 'account_transfer' },
                    { label: 'UPI', value: 'upi' },
                    { label: 'DD', value: 'dd' },
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
              <h3 className="text-lg font-medium text-gray-900">No collection records found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-medium">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg cursor-pointer hover:bg-gray-100" onClick={() => handleSort('payment_date')}>
                      <div className="flex items-center gap-1">Date {sortConfig.column === 'payment_date' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('customer')}>
                      <div className="flex items-center gap-1">Customer Name {sortConfig.column === 'customer' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('project')}>
                      <div className="flex items-center gap-1">Project & Unit {sortConfig.column === 'project' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                    </th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Remarks / Reference</th>
                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('amount')}>
                      <div className="flex items-center justify-end gap-1">Amount {sortConfig.column === 'amount' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                    </th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map(({ payment, sale, customer, project, executive }) => (
                    <tr key={payment._id} className="hover:bg-gray-50 transition-colors dark:hover:bg-white/5">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#0A1C37] dark:text-gray-200">
                        <div>{customer?.name || <span className="text-gray-400 text-xs">N/A</span>}</div>
                        <div className="text-xs text-gray-400 font-normal">Exec: {executive?.full_name || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 dark:text-gray-300">{project?.name || 'Unknown Project'}</div>
                        <div className="text-xs text-gray-500">Unit: {sale.unit_number || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-medium capitalize">
                          {payment.payment_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap capitalize text-gray-600 dark:text-gray-400">
                        {payment.payment_mode?.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate" title={payment.remarks}>
                        {payment.remarks || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#2BA67A] whitespace-nowrap">
                        {formatCurrency(payment.amount || 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openDetailModal(sale)} title="View Sale Details">
                            <Eye size={16} />
                          </Button>
                          {canEdit && (
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

      {/* Render Shared Modals */}
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
        onDelete={(id) => handleDeleteSale(id)}
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
