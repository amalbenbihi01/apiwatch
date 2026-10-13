'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
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
      {/* Header partagé unifié */}
      <AppHeader />

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
              Inspection granulaire des contrôles d&apos;API, percentiles P95, médiane, MTTR et extraction CSV.
            </p>
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
