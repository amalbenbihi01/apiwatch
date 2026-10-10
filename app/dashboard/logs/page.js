'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TeamSwitcher from '@/components/team/TeamSwitcher';
import NotificationBell from '@/components/api-monitoring/NotificationBell';
import LogsFilterBar from '@/components/logs/LogsFilterBar';
import LogsTable from '@/components/logs/LogsTable';
import LogDetailModal from '@/components/logs/LogDetailModal';
import AdvancedAnalyticsCards from '@/components/logs/AdvancedAnalyticsCards';
import HttpStatusDistributionChart from '@/components/logs/HttpStatusDistributionChart';
import AnalyticsChart from '@/components/api-monitoring/AnalyticsChart';
import { useApis } from '@/hooks/use-apis';
import { useLogs } from '@/hooks/use-logs';
import { useAdvancedAnalytics } from '@/hooks/use-analytics';

export default function LogsAndAnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  // Filter state
  const [filters, setFilters] = useState({
    endpointId: 'all',
    status: 'all',
    httpCode: 'all',
    search: '',
    period: '24h',
    page: 1,
    limit: 20,
  });

  const [selectedCheckId, setSelectedCheckId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Queries
  const { data: apis = [] } = useApis();
  const { data: logsData, isLoading: isLoadingLogs } = useLogs(filters);
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useAdvancedAnalytics({
    endpointId: filters.endpointId,
    period: filters.period === 'all' ? '30d' : filters.period,
  });

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (err) {
        router.push('/login');
      }
    }

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1, // Reset to page 1 on filter change
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      endpointId: 'all',
      status: 'all',
      httpCode: 'all',
      search: '',
      period: '24h',
      page: 1,
      limit: 20,
    });
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (filters.endpointId && filters.endpointId !== 'all') params.set('endpointId', filters.endpointId);
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.httpCode && filters.httpCode !== 'all') params.set('httpCode', filters.httpCode);
      if (filters.search && filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.period && filters.period !== 'all') params.set('period', filters.period);
      params.set('limit', '1000'); // Server enforced maximum

      const res = await fetch(`/api/logs/export?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de l’export');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apiwatch-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || 'Échec du téléchargement du fichier CSV');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <Link href="/dashboard" className="font-bold text-lg text-white hover:text-indigo-400 transition-colors">
            APIWatch
          </Link>
          <div className="hidden sm:block ml-2">
            <TeamSwitcher />
          </div>
          <span className="hidden lg:inline-flex items-center space-x-1.5 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full ml-2 font-mono">
            <span>Logs & Analytics v20</span>
          </span>
        </div>

        {user && (
          <div className="flex items-center space-x-3 sm:space-x-4">
            <NotificationBell />
            <span className="text-sm text-slate-300 hidden md:inline">
              {user.name} <span className="text-slate-500">({user.email})</span>
            </span>
            <button
              onClick={handleLogout}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-slate-600"
            >
              Déconnexion
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Top Navigation / Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                ← Tableau de bord
              </Link>
              <span className="text-slate-600">/</span>
              <h1 className="text-xl font-bold text-white">Logs & Analytics Avancés</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Inspection granulaire des contrôles d'API, percentiles P95, médiane, MTTR et extraction CSV.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/team"
              className="bg-slate-700 hover:bg-slate-650 border border-slate-600 text-slate-200 font-medium px-3.5 py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>👥</span>
              <span>Équipe</span>
            </Link>
            <Link
              href="/dashboard/status-page"
              className="bg-slate-700 hover:bg-slate-650 border border-slate-600 text-slate-200 font-medium px-3.5 py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>🌐</span>
              <span>Page de statut</span>
            </Link>
          </div>
        </div>

        {/* Advanced KPI Cards (P95, Median, Min, Max, Avg, MTTR, Uptime, Total Checks) */}
        <AdvancedAnalyticsCards
          analytics={analyticsData}
          isLoading={isLoadingAnalytics}
        />

        {/* Visual Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsChart
            series={analyticsData?.chartSeries || []}
            isLoading={isLoadingAnalytics}
          />
          <HttpStatusDistributionChart
            distribution={analyticsData?.httpDistribution}
            isLoading={isLoadingAnalytics}
          />
        </div>

        {/* Filter Bar */}
        <LogsFilterBar
          endpoints={apis}
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          onExportCsv={handleExportCsv}
          isExporting={isExporting}
        />

        {/* Logs Table */}
        <LogsTable
          checks={logsData?.checks || []}
          pagination={logsData?.pagination || {}}
          isLoading={isLoadingLogs}
          onPageChange={(p) => handleFilterChange('page', p)}
          onLimitChange={(l) => handleFilterChange('limit', l)}
          onSelectCheck={(id) => setSelectedCheckId(id)}
        />
      </main>

      {/* Log Detail Modal */}
      {selectedCheckId && (
        <LogDetailModal
          checkId={selectedCheckId}
          onClose={() => setSelectedCheckId(null)}
        />
      )}
    </div>
  );
}
