import { useEffect, useState, useMemo } from 'react';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { KPICard } from '../ui/KPICard';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { CelebrationCards } from '../sales-executive/CelebrationCards';
import {
  TrendingUp, DollarSign, Target,
  Award, MapPin, Briefcase,
  Activity
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, isSameMonth, parseISO, isAfter } from 'date-fns';

// --- Interfaces ---
interface DashboardMetrics {
  mtdSales: number;
  mtdRevenue: number;
  mtdSalesGrowth: number;
  mtdRevenueGrowth: number;
  ytdSales: number;
  ytdRevenue: number;
  ytdSalesGrowth: number;
  ytdRevenueGrowth: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  avatarUrl: string | null;
  revenue: number;
  area: number;
  salesCount: number;
  targetAchievement: number;
  trend: 'up' | 'down' | 'neutral';
}

interface TeamTargetStatus {
  id: string;
  name: string;
  role: string;
  targetAmount: number;
  achievedAmount: number;
  shortfall: number;
  percentage: number;
}

interface OperationalData {
  projects: { name: string; status: string; salesSqFt: number; imageUrl: string | null }[];
  siteVisits: { total: number; avgPerExec: number; conversionRate: number };
}

const LeaderboardItem = ({ rank, name, area, image_url, role }: { rank: number, name: string, area: number, image_url?: string | null, role?: string }) => {
  const getBorderColor = (rank: number) => {
    if (rank === 1) return 'border-yellow-400';
    if (rank === 2) return 'border-gray-300';
    if (rank === 3) return 'border-orange-400';
    return 'border-blue-100 dark:border-blue-500/20';
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-400 text-white';
    if (rank === 2) return 'bg-gray-400 text-white';
    if (rank === 3) return 'bg-orange-400 text-white';
    return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
  };

  return (
    <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors group">
      <div className="flex items-center gap-4">
        <div className={`relative w-12 h-12 rounded-full border-2 p-0.5 ${getBorderColor(rank)}`}>
          {image_url ? (
            <img src={image_url} alt={name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-sm font-bold text-slate-400 dark:text-gray-400">
              {name.charAt(0)}
            </div>
          )}
          <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ring-1 ring-white dark:ring-surface-highlight ${getRankBg(rank)}`}>
            {rank}
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{name}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{(role || 'Sales Executive').replace('_', ' ')}</span>
        </div>
      </div>
      <div className="text-right">
        <span className="block font-bold text-gray-900 dark:text-gray-200">{area.toLocaleString()}</span>
        <span className="text-xs text-gray-500 dark:text-gray-500 font-medium">Sq ft</span>
      </div>
    </div>
  );
};

export function TeamLeaderDashboard() {
  const { profile } = useAuth();

  // Convex Queries
  const profilesRaw = useQuery(api.profiles.list);
  const salesRaw = useQuery(api.sales.list);
  const targetsRaw = useQuery(api.targets.listAll);
  const siteVisits = useQuery(api.site_visits.listAll);
  const projectsRaw = useQuery(api.projects.list);

  const stats = useMemo(() => {
    if (!profile || !profilesRaw || !salesRaw || !targetsRaw || !siteVisits || !projectsRaw) return null;

    const now = new Date();
    const currentYearStart = startOfYear(now);
    const monthStartStr = format(startOfMonth(now), 'yyyy-MM-dd');
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // 1. Team Members
    const teamMembers = profilesRaw.filter((p: any) => 
      p.reporting_manager_id === profile.id || p._id === profile.id
    ).filter((p: any) => p.is_active);

    const teamIds = new Set(teamMembers.map((m: any) => m._id));

    // 2. Sales Data for Team
    const teamSales = salesRaw.filter((s: any) => teamIds.has(s.sales_executive_id));

    // 3. MTD Metrics
    const mtdSalesData = teamSales.filter((s: any) => isSameMonth(parseISO(s.sale_date), now));
    const lastMonthSalesData = teamSales.filter((s: any) => {
      const d = parseISO(s.sale_date);
      return d >= lastMonthStart && d <= lastMonthEnd;
    });

    const mtdRevenue = mtdSalesData.reduce((sum: number, s: any) => sum + (s.total_revenue || 0), 0);
    const lastMonthRevenue = lastMonthSalesData.reduce((sum: number, s: any) => sum + (s.total_revenue || 0), 0);

    // 4. YTD Metrics
    const ytdSalesData = teamSales.filter((s: any) => isAfter(parseISO(s.sale_date), currentYearStart) || isSameMonth(parseISO(s.sale_date), currentYearStart));
    const ytdRevenue = ytdSalesData.reduce((sum: number, s: any) => sum + (s.total_revenue || 0), 0);

    const metrics: DashboardMetrics = {
      mtdSales: mtdSalesData.length,
      mtdRevenue: mtdRevenue,
      mtdSalesGrowth: lastMonthSalesData.length ? ((mtdSalesData.length - lastMonthSalesData.length) / lastMonthSalesData.length) * 100 : 100,
      mtdRevenueGrowth: lastMonthRevenue ? ((mtdRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 100,
      ytdSales: ytdSalesData.length,
      ytdRevenue: ytdRevenue,
      ytdSalesGrowth: 0,
      ytdRevenueGrowth: 0
    };

    // 5. Chart Data (Last 6 Months)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      return {
        name: format(d, 'MMM'),
        date: d,
        revenue: 0,
        target: 5000000
      };
    });

    teamSales.forEach((s: any) => {
      const d = parseISO(s.sale_date);
      const monthIdx = months.findIndex(m => isSameMonth(m.date, d));
      if (monthIdx >= 0) {
        months[monthIdx].revenue += (s.total_revenue || 0);
      }
    });

    // 6. Leaderboard & Target Status
    const teamTargets = targetsRaw.filter((t: any) => 
      teamIds.has(t.user_id) && 
      t.period_type === 'monthly' && 
      (t.start_date || t.period_start) === monthStartStr
    );

    const leaderboardData = teamMembers.map((member: any) => {
      const memberSalesMTD = mtdSalesData.filter((s: any) => s.sales_executive_id === member._id);
      const memberSalesYTD = ytdSalesData.filter((s: any) => s.sales_executive_id === member._id);

      const memberRev = memberSalesMTD.reduce((sum: number, s: any) => sum + (s.total_revenue || 0), 0);
      const memberAreaMTD = memberSalesMTD.reduce((sum: number, s: any) => sum + (s.area_sqft || 0), 0);
      const memberAreaYTD = memberSalesYTD.reduce((sum: number, s: any) => sum + (s.area_sqft || 0), 0);

      const target = teamTargets.find((t: any) => t.user_id === member._id)?.target_amount || 1000000;

      return {
        id: member._id,
        name: member.full_name,
        avatarUrl: member.image_url,
        revenue: memberRev,
        areaMTD: memberAreaMTD,
        areaYTD: memberAreaYTD,
        salesCount: memberSalesMTD.length,
        targetAchievement: (memberRev / target) * 100,
        role: member.role,
        trend: 'neutral' as const
      };
    });

    const mtdAreaSorted = [...leaderboardData].map(d => ({ ...d, area: d.areaMTD })).sort((a, b) => b.area - a.area);
    const ytdAreaSorted = [...leaderboardData].map(d => ({ ...d, area: d.areaYTD })).sort((a, b) => b.area - a.area);

    const targetStatusData = leaderboardData.map(l => {
      const targetObj = teamTargets.find((t: any) => t.user_id === l.id);
      const targetAmt = targetObj?.target_amount || 1000000;
      return {
        id: l.id,
        name: l.name,
        role: l.role,
        targetAmount: targetAmt,
        achievedAmount: l.revenue,
        shortfall: Math.max(0, targetAmt - l.revenue),
        percentage: l.targetAchievement
      }
    });

    // 7. Site Visits
    const teamVisits = siteVisitsRaw.filter((v: any) => teamIds.has(v.requested_by));
    const totalVisits = teamVisits.length;
    const conversion = totalVisits > 0 ? (mtdSalesData.length / totalVisits) * 100 : 0;

    // 8. Project Wise
    const projectSalesMap = new Map<string, number>();
    ytdSalesData.forEach((sale: any) => {
      if (sale.project_id) {
        projectSalesMap.set(sale.project_id, (projectSalesMap.get(sale.project_id) || 0) + (sale.area_sqft || 0));
      }
    });

    const projectStats = projectsRaw.map((p: any) => ({
      name: p.name,
      status: 'Active',
      salesSqFt: projectSalesMap.get(p._id) || 0,
      imageUrl: p.site_photos?.[0] || null
    })).sort((a: any, b: any) => b.salesSqFt - a.salesSqFt).slice(0, 4);

    return {
      metrics,
      salesTrend: months,
      areaLeaderboard: { mtd: mtdAreaSorted, ytd: ytdAreaSorted },
      teamTargets: targetStatusData,
      operational: {
        projects: projectStats,
        siteVisits: {
          total: totalVisits,
          avgPerExec: teamMembers.length ? (totalVisits / teamMembers.length) : 0,
          conversionRate: conversion
        }
      }
    };
  }, [profile, profilesRaw, salesRaw, targetsRaw, siteVisits, projectsRaw]);

  if (!stats) {
    return <LoadingSpinner size="lg" fullScreen />;
  }

  const { metrics, salesTrend, areaLeaderboard, teamTargets, operational } = stats;

  return (
    <div className="space-y-6 pb-12">
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-900/80 dark:to-teal-900/80 rounded-3xl p-8 shadow-2xl shadow-emerald-200 dark:shadow-none border border-white/10">
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
                Welcome Back, {profile?.full_name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-emerald-100 text-sm font-medium">
                Here's what's happening with your team today.
              </p>
            </div>
          </div>

          <div className="flex w-full md:w-auto mt-2 md:mt-0 justify-start md:justify-end gap-3 items-center">
            <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-xs md:text-sm font-medium whitespace-nowrap">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <KPICard
          title="MTD Revenue"
          value={formatCurrency(metrics.mtdRevenue, true)}
          icon={DollarSign}
          trend={{ value: parseFloat(metrics.mtdRevenueGrowth.toFixed(1)), isPositive: metrics.mtdRevenueGrowth >= 0 }}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBgColor="bg-emerald-100 dark:bg-emerald-500/20"
        />
        <KPICard
          title="MTD Sales"
          value={metrics.mtdSales}
          icon={Target}
          trend={{ value: parseFloat(metrics.mtdSalesGrowth.toFixed(1)), isPositive: metrics.mtdSalesGrowth >= 0 }}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-100 dark:bg-blue-500/20"
        />
        <KPICard
          title="YTD Revenue"
          value={formatCurrency(metrics.ytdRevenue, true)}
          icon={TrendingUp}
          subtitle="Current Fiscal Year"
          iconColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-100 dark:bg-purple-500/20"
        />
        <KPICard
          title="Avg Team Performance"
          value={`${(teamTargets.reduce((a, b) => a + b.percentage, 0) / (teamTargets.length || 1)).toFixed(1)}%`}
          icon={Award}
          subtitle="Goal Achievement"
          iconColor="text-orange-600 dark:text-orange-400"
          iconBgColor="bg-orange-100 dark:bg-orange-500/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl shadow-card-custom overflow-hidden">
            <CardHeader className="bg-white dark:bg-surface-dark border-b border-slate-50 dark:border-white/5 pb-4">
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] sm:h-[350px] pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1673FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1673FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:opacity-10" />
                  <XAxis dataKey="name" fontSize={12} stroke="#6B7280" />
                  <YAxis
                    fontSize={12}
                    stroke="#6B7280"
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                  />
                  <RechartsTooltip
                    formatter={(val: number) => formatCurrency(val)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#1673FF"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-card-custom overflow-hidden">
            <CardHeader className="bg-white dark:bg-surface-dark border-b border-slate-50 dark:border-white/5 pb-4">
              <CardTitle className="flex items-center justify-between">
                <span>Monthly Team Targets</span>
                <span className="text-sm font-normal text-slate-400">Revenue Goals</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] overflow-y-auto p-0">
              <div className="">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-white/5 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left">Executive</th>
                      <th className="px-4 py-3 text-right">Target</th>
                      <th className="px-4 py-3 text-right">Achieved</th>
                      <th className="px-4 py-3 text-left pl-8 w-1/3">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {teamTargets.map((t) => (
                      <tr key={t.id} className={`hover:bg-gray-50/50 dark:hover:bg-white/5 ${t.id === profile?.id ? 'bg-blue-50/30 dark:bg-blue-500/5' : ''}`}>
                        <td className="px-4 py-3">
                           <div className="flex flex-col">
                             <span className="font-medium text-gray-900 dark:text-gray-200">{t.name}{t.id === profile?.id && ' (You)'}</span>
                             <span className="text-[10px] text-gray-400 uppercase">{t.role?.replace('_', ' ')}</span>
                           </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{formatCurrency(t.targetAmount)}</td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-semibold">{formatCurrency(t.achievedAmount)}</td>
                        <td className="px-4 py-3 pl-8">
                           <div className="flex items-center gap-3">
                             <div className="flex-1 h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                               <div
                                 className={`h-full rounded-full ${t.percentage >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                 style={{ width: `${Math.min(t.percentage, 100)}%` }}
                               />
                             </div>
                             <span className="text-xs font-semibold w-10 dark:text-gray-300">{t.percentage.toFixed(0)}%</span>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-3xl shadow-card-custom overflow-hidden">
            <CardHeader className="bg-white dark:bg-surface-dark border-b border-slate-50 dark:border-white/5 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Briefcase size={18} /> Project Performance (YTD)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] sm:h-[325px] pt-6 flex flex-col">
              <div className="flex-1 grid grid-cols-2 gap-3 overflow-y-auto">
                {operational.projects.map((p, i) => (
                  <div key={i} className="p-3 rounded-xl border border-gray-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 hover:shadow-md transition-all flex flex-col justify-between h-24">
                    <div className="flex justify-between items-start">
                      <div className="p-1.5 bg-white dark:bg-surface-highlight rounded-lg border border-gray-100 dark:border-white/5 text-indigo-600 dark:text-indigo-400">
                        <Briefcase size={16} />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-800 dark:text-white truncate mb-1">{p.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                        YTD: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{p.salesSqFt.toLocaleString()} Sq. Ft.</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-card-custom overflow-hidden">
            <CardHeader className="bg-white dark:bg-surface-dark border-b border-slate-50 dark:border-white/5 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Activity size={18} /> Operational Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] p-4 flex flex-col justify-center gap-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-400">
                  <MapPin size={16} /> <span className="text-xs font-bold uppercase">Visits</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{operational.siteVisits.total}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Completed</p>
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-500/20 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2 text-purple-700 dark:text-purple-400">
                  <Activity size={16} /> <span className="text-xs font-bold uppercase">Conv.</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{operational.siteVisits.conversionRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Visit to Sale</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="rounded-3xl overflow-hidden">
          <CardHeader className="bg-white dark:bg-surface-dark border-b border-slate-50 dark:border-white/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              🏆 Monthly Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-1">
              {areaLeaderboard.mtd.length > 0 ? (
                areaLeaderboard.mtd.slice(0, 5).map((item, index) => (
                  <LeaderboardItem
                    key={item.id + '-m'}
                    rank={index + 1}
                    name={item.name}
                    area={item.area}
                    image_url={item.avatarUrl}
                    role={(item as any).role}
                  />
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-6">No sales data for this month yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl overflow-hidden">
          <CardHeader className="bg-white dark:bg-surface-dark border-b border-slate-50 dark:border-white/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              👑 Yearly Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-1">
              {areaLeaderboard.ytd.length > 0 ? (
                areaLeaderboard.ytd.slice(0, 5).map((item, index) => (
                  <LeaderboardItem
                    key={item.id + '-y'}
                    rank={index + 1}
                    name={item.name}
                    area={item.area}
                    image_url={item.avatarUrl}
                    role={(item as any).role}
                  />
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-6">No sales data for this year yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <CelebrationCards />
    </div>
  );
}
