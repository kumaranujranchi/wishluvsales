import { useEffect, useState, useMemo } from 'react';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { KPICard } from '../ui/KPICard';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import {
    Users,
    Building,
    TrendingUp,
    DollarSign,
    Briefcase,
    Megaphone,
    Sparkles,
    Award,
    CreditCard
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from 'recharts';
import { Tooltip } from '../ui/Tooltip';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { RecentActivityLog } from './widgets/RecentActivityLog';
import { ActivityCalendar } from './widgets/ActivityCalendar';
import { UpcomingEvents } from './widgets/UpcomingEvents';
import { Select } from '../ui/Select';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon } from 'lucide-react';
import { startOfMonth, startOfYear, isSameMonth, parseISO, isAfter, format } from 'date-fns';

interface DashboardStats {
    totalProjects: number;
    totalTeamMembers: number;
    totalDepartments: number;
    monthlySales: number;
    monthlyRevenue: number;
    ytdSales: number;
    ytdRevenue: number;
    pendingSiteVisits: number;
}

interface ChartData {
    name: string;
    sales: number;
    revenue: number;
    collections: number;
}

interface LeaderboardUser {
    id: string;
    name: string;
    salesCount: number;
    revenue: number;
    image_url: string | null;
}

interface Announcement {
    id: string;
    title: string;
    content: string;
    created_at: string;
    is_important: boolean;
}

export function CRMDashboard() {
    const { profile } = useAuth();

    // Convex Queries
    const profiles = useQuery(api.profiles.list);
    const projects = useQuery(api.projects.list);
    const sales = useQuery(api.sales.list);
    const payments = useQuery(api.payments.listAll);
    const segments = useQuery(api.departments.list) || [];
    // activityLogsRaw removed to prevent Server Error crashes

    // Filters
    const [leaderboardTimeFilter, setLeaderboardTimeFilter] = useState<'today' | 'this_week' | 'this_month' | 'this_year'>('this_month');
    const [leaderboardRoleFilter, setLeaderboardRoleFilter] = useState<'all' | 'sales_executive' | 'team_leader'>('all');

    const statsData = useMemo(() => {
        if (!profiles || !projects || !sales || !payments) return null;
        const activityLogsRaw: any[] = [];

        const now = new Date();
        const monthStart = startOfMonth(now);
        const yearStart = startOfYear(now);

        // 1. Basic Stats
        const totalProjects = projects.filter((p: any) => p.is_active).length;
        const totalTeamMembers = profiles.filter((p: any) => p.is_active).length;
        const totalDepartments = segments.length; // Fallback or dynamic
        const pendingSiteVisits = 0; // Site visits feature temporarily removed

        // 2. Sales Metrics
        const currentMonthSales = sales.filter((s: any) => isSameMonth(parseISO(s.sale_date), now));
        const ytdSalesList = sales.filter((s: any) => isAfter(parseISO(s.sale_date), yearStart) || isSameMonth(parseISO(s.sale_date), yearStart));

        const monthlyRevenue = currentMonthSales.reduce((sum: number, s: any) => sum + Number(s.total_revenue || 0), 0);
        const ytdRevenue = ytdSalesList.reduce((sum: number, s: any) => sum + Number(s.total_revenue || 0), 0);

        // 3. Chart Data (Monthly for this year)
        const salesByMonth = new Map<string, { sales: number; revenue: number; collections: number }>();
        for (let i = 0; i <= now.getMonth(); i++) {
            const d = new Date(now.getFullYear(), i, 1);
            const key = format(d, 'MMM');
            salesByMonth.set(key, { sales: 0, revenue: 0, collections: 0 });
        }

        ytdSalesList.forEach((s: any) => {
            const monthKey = format(parseISO(s.sale_date), 'MMM');
            const current = salesByMonth.get(monthKey) || { sales: 0, revenue: 0, collections: 0 };
            salesByMonth.set(monthKey, {
                ...current,
                sales: current.sales + 1,
                revenue: current.revenue + Number(s.total_revenue || 0)
            });
        });

        payments.filter((p: any) => isAfter(parseISO(p.payment_date), yearStart) || isSameMonth(parseISO(p.payment_date), yearStart)).forEach((p: any) => {
            const monthKey = format(parseISO(p.payment_date), 'MMM');
            const current = salesByMonth.get(monthKey);
            if (current) {
                current.collections += Number(p.amount || 0);
                salesByMonth.set(monthKey, current);
            }
        });

        const chartData = Array.from(salesByMonth.entries()).map(([name, data]) => ({
            name,
            ...data
        }));

        // 4. Leaderboard Calculation
        const profileMap = new Map(profiles.map((p: any) => [p._id, p]));
        
        const getStartDate = () => {
            const d = new Date(now);
            d.setHours(0, 0, 0, 0);
            if (leaderboardTimeFilter === 'today') return d;
            if (leaderboardTimeFilter === 'this_week') {
                d.setDate(d.getDate() - d.getDay());
                return d;
            }
            if (leaderboardTimeFilter === 'this_month') return monthStart;
            return yearStart;
        };

        const filterStart = getStartDate();
        const filteredSalesForLeaderboard = sales.filter((s: any) => {
            const sDate = parseISO(s.sale_date);
            if (sDate < filterStart) return false;
            if (leaderboardRoleFilter !== 'all') {
                const u = profileMap.get(s.sales_executive_id);
                if (u?.role !== leaderboardRoleFilter) return false;
            }
            return true;
        });

        const lbMap = new Map<string, LeaderboardUser>();
        filteredSalesForLeaderboard.forEach((s: any) => {
            const u = profileMap.get(s.sales_executive_id);
            if (u) {
                const curr = lbMap.get(s.sales_executive_id) || {
                    id: s.sales_executive_id,
                    name: u.full_name,
                    salesCount: 0,
                    revenue: 0,
                    image_url: u.image_url
                };
                curr.salesCount++;
                curr.revenue += Number(s.total_revenue || 0);
                lbMap.set(s.sales_executive_id, curr);
            }
        });

        const topPerformers = Array.from(lbMap.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // 5. Recent Items
        const projectMap = new Map(projects.map((p: any) => [p._id, p]));
        const recentSales = [...sales]
            .sort((a, b) => parseISO(b.sale_date).getTime() - parseISO(a.sale_date).getTime())
            .slice(0, 6)
            .map((s: any) => ({
                ...s,
                customer: { name: s.customer_name }, // Convex customer data handling
                project: projectMap.get(s.project_id),
                profile: profileMap.get(s.sales_executive_id)
            }));

        const announcements: any[] = []; // Announcements feature temporarily removed

        const activityLogs = activityLogsRaw
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 20);

        return {
            stats: {
                totalProjects,
                totalTeamMembers,
                totalDepartments,
                monthlySales: currentMonthSales.length,
                monthlyRevenue,
                ytdSales: ytdSalesList.length,
                ytdRevenue,
                pendingSiteVisits
            },
            chartData,
            topPerformers,
            recentSales,
            announcements,
            activityLogs
        };
    }, [profiles, projects, sales, payments, segments, leaderboardTimeFilter, leaderboardRoleFilter]);

    if (!statsData) {
        return <LoadingSpinner size="lg" fullScreen />;
    }

    const { stats, chartData, topPerformers, recentSales, announcements, activityLogs } = statsData;

    return (
        <div className="space-y-8 pb-8">
            <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-8 shadow-2xl shadow-indigo-200">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 text-white">
                    <div className="flex items-center gap-5">
                        <div className="p-1 bg-white/20 rounded-2xl backdrop-blur-sm">
                            {profile?.image_url ? (
                                <img src={profile.image_url} alt={profile.full_name || 'User'} className="w-16 h-16 rounded-xl object-cover border-2 border-white/50" />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-2xl font-bold border-2 border-white/50">
                                    {profile?.full_name?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-xl md:text-3xl font-bold tracking-tight">
                                Hello, {profile?.full_name?.split(' ')[0]}! 👋
                            </h1>
                            <p className="text-indigo-100 text-sm font-medium">
                                Here's what's happening with your projects today.
                            </p>
                        </div>
                    </div>

                    <div className="flex w-full md:w-auto mt-2 md:mt-0 justify-start md:justify-end gap-3">
                        <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-xs md:text-sm font-medium whitespace-nowrap">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <KPICard
                    title="Total Active Projects"
                    value={stats.totalProjects}
                    icon={Building}
                    iconBgColor="bg-blue-500/10"
                    iconColor="text-blue-600"
                />
                <KPICard
                    title="Total Team Members"
                    value={stats.totalTeamMembers}
                    icon={Users}
                    iconBgColor="bg-green-500/10"
                    iconColor="text-green-600"
                />
                <KPICard
                    title="Departments"
                    value={stats.totalDepartments}
                    icon={Briefcase}
                    iconBgColor="bg-purple-500/10"
                    iconColor="text-purple-600"
                    className="hidden md:block"
                />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Sales (This Month)"
                    value={stats.monthlySales}
                    icon={TrendingUp}
                    iconBgColor="bg-blue-500/10"
                    iconColor="text-blue-600"
                    formatter={(val) => val.toString()}
                />
                <KPICard
                    title="Sales (YTD)"
                    value={stats.ytdSales}
                    icon={TrendingUp}
                    iconBgColor="bg-indigo-500/10"
                    iconColor="text-indigo-600"
                    formatter={(val) => val.toString()}
                />
                <KPICard
                    title="Revenue (This Month)"
                    value={stats.monthlyRevenue}
                    icon={DollarSign}
                    iconBgColor="bg-green-500/10"
                    iconColor="text-green-600"
                    formatter={(val) => formatCurrency(val, true)}
                />
                <KPICard
                    title="Revenue (YTD)"
                    value={stats.ytdRevenue}
                    icon={DollarSign}
                    iconBgColor="bg-emerald-500/10"
                    iconColor="text-emerald-600"
                    formatter={(val) => formatCurrency(val, true)}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="rounded-3xl border-0 shadow-[0_2px_20px_rgb(0,0,0,0.04)] overflow-hidden ring-1 ring-slate-100 dark:ring-white/10 dark:bg-surface-dark dark:shadow-none">
                    <CardHeader className="border-b border-slate-100/50 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-white">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-100 dark:ring-indigo-500/30">
                                    <TrendingUp size={20} />
                                </div>
                                Sales Trends
                            </CardTitle>
                            <div className="flex gap-2">
                                <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md">Last 12 Months</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[250px] sm:h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.6} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                                        tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            padding: '12px'
                                        }}
                                        cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="sales"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorSales)"
                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border-0 shadow-[0_2px_20px_rgb(0,0,0,0.04)] overflow-hidden ring-1 ring-slate-100 dark:ring-white/10 dark:bg-surface-dark dark:shadow-none">
                    <CardHeader className="border-b border-slate-50 dark:border-white/10 pb-4">
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-white">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-500/30">
                                    <CreditCard size={20} />
                                </div>
                                Payment Collections
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[250px] sm:h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCollections" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.6} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                                        tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}
                                    />
                                    <RechartsTooltip
                                        formatter={(val: number) => `₹${(val / 1000).toFixed(1)}k`}
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            padding: '12px'
                                        }}
                                        cursor={{ stroke: '#10B981', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="collections"
                                        stroke="#10B981"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorCollections)"
                                        name="Collections"
                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#059669' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="h-[400px] sm:h-[500px]">
                    <ActivityCalendar activities={activityLogs} />
                </div>

                <Card className="h-[400px] sm:h-[500px] flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100 dark:ring-white/10 dark:bg-surface-dark overflow-hidden">
                    <CardHeader className="border-b border-slate-100/50 dark:border-white/10 pb-4">
                        <div className="flex flex-row items-center justify-between mb-4">
                            <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-white">
                                <div className="p-2 bg-amber-50 dark:bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 ring-1 ring-amber-100 dark:ring-amber-500/30">
                                    <Award size={20} />
                                </div>
                                Top Performers
                            </CardTitle>
                        </div>
                        <div className="flex gap-2">
                            <Select
                                value={leaderboardTimeFilter}
                                onChange={(e: any) => setLeaderboardTimeFilter(e.target.value)}
                                className="h-8 text-xs bg-slate-50 dark:bg-white/5 border-transparent hover:bg-slate-100 dark:hover:bg-white/10 focus:ring-amber-500/20 rounded-lg transition-colors dark:text-white"
                                options={[
                                    { value: 'today', label: 'Today' },
                                    { value: 'this_week', label: 'This Week' },
                                    { value: 'this_month', label: 'This Month' },
                                    { value: 'this_year', label: 'This Year' }
                                ]}
                            />
                            <Select
                                value={leaderboardRoleFilter}
                                onChange={(e: any) => setLeaderboardRoleFilter(e.target.value)}
                                className="h-8 text-xs bg-slate-50 dark:bg-white/5 border-transparent hover:bg-slate-100 dark:hover:bg-white/10 focus:ring-amber-500/20 rounded-lg transition-colors dark:text-white"
                                options={[
                                    { value: 'all', label: 'All Roles' },
                                    { value: 'sales_executive', label: 'Executives' },
                                    { value: 'team_leader', label: 'TLs' }
                                ]}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <div className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {topPerformers.map((user, index) => (
                                    <motion.div
                                        key={user.id}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                        className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-100 dark:hover:border-white/10 transition-all group cursor-default"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className={`absolute -top-2 -left-2 w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold border-2 border-white dark:border-surface-dark shadow-sm z-10
                            ${index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                                        index === 1 ? 'bg-slate-300 text-slate-700' :
                                                            index === 2 ? 'bg-orange-300 text-orange-800' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-gray-400'}
                         `}>
                                                    #{index + 1}
                                                </div>
                                                {user.image_url ? (
                                                    <img src={user.image_url} alt={user.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-50 dark:ring-white/10 group-hover:ring-white dark:group-hover:ring-white/20 shadow-sm transition-all" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-slate-100 dark:from-indigo-500/20 dark:to-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold ring-2 ring-slate-50 dark:ring-white/10 group-hover:ring-white dark:group-hover:ring-white/20 shadow-sm transition-all">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{user.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-slate-500 dark:text-gray-400 font-medium bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded-md">{user.salesCount} Sales</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="font-bold text-slate-900 dark:text-white text-sm">{formatCurrency(user.revenue)}</div>
                                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                Revenue
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-[400px]">
                    <RecentActivityLog activities={activityLogs} />
                </div>

                <div className="h-[400px]">
                    <Card className="h-full flex flex-col rounded-3xl border-0 shadow-[0_2px_20px_rgb(0,0,0,0.04)] ring-1 ring-slate-100 dark:ring-white/10 overflow-hidden dark:bg-surface-dark">
                        <CardHeader className="border-b border-slate-100 dark:border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-rose-50/50 dark:bg-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 ring-1 ring-rose-100/50 dark:ring-rose-500/30">
                                    <Megaphone size={20} />
                                </div>
                                <CardTitle className="text-slate-800 dark:text-white text-base">Announcements</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 flex-1 overflow-auto custom-scrollbar">
                            <div className="space-y-4">
                                {announcements.map((ann: any) => (
                                    <div key={ann._id} className="p-4 bg-white dark:bg-surface-dark rounded-xl border border-slate-100 dark:border-white/10 hover:border-rose-200 dark:hover:border-rose-500/30 hover:shadow-md transition-all group relative overflow-hidden">
                                        <div className="relative">
                                            <div className="flex justify-between items-start mb-2 gap-4">
                                                <h4 className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors line-clamp-1">{ann.title}</h4>
                                                {ann.is_important && (
                                                    <span className="shrink-0 text-[10px] bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full font-bold shadow-sm">
                                                        Important
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-gray-400 line-clamp-2 leading-relaxed mb-3">{ann.content}</p>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-gray-500 font-medium">
                                                <CalendarIcon size={12} />
                                                <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <UpcomingEvents />
            </div>

            <Card className="rounded-3xl border-0 shadow-[0_2px_20px_rgb(0,0,0,0.04)] overflow-hidden ring-1 ring-slate-100 dark:ring-white/10 dark:bg-surface-dark">
                <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-white/10 bg-gray-50/30 dark:bg-surface-dark">
                    <CardTitle className="flex items-center gap-3 dark:text-white">
                        <div className="p-2 bg-blue-50 dark:bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <TrendingUp size={20} />
                        </div>
                        Recent Sales
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-50/80 dark:bg-surface-dark/95 backdrop-blur-sm z-10">
                                <tr>
                                    <th className="px-6 py-4 text-left font-bold text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wider rounded-l-lg hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors">Customer</th>
                                    <th className="px-6 py-4 text-left font-bold text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wider hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors">Project</th>
                                    <th className="px-6 py-4 text-left font-bold text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wider hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors">Sold By</th>
                                    <th className="px-6 py-4 text-right font-bold text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wider rounded-r-lg hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="space-y-2">
                                {recentSales.map((sale: any) => (
                                    <tr key={sale._id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all rounded-lg border-b border-transparent hover:border-slate-100 dark:hover:border-white/10">
                                        <td className="px-6 py-4 rounded-l-lg">
                                            <div className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{sale.customer?.name || 'Unknown'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-medium">{sale.project?.name}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-xs font-bold ring-2 ring-white dark:ring-white/10 shadow-sm">
                                                        {sale.profile?.full_name?.charAt(0)}
                                                    </div>
                                                </div>
                                                <span className="text-gray-700 dark:text-gray-200 font-medium">{sale.profile?.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right rounded-r-lg">
                                            <span className="font-bold text-gray-900 dark:text-white px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100/50 dark:ring-emerald-500/30">
                                                {formatCurrency(sale.total_revenue)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
