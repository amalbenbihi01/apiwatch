'use client';

import AppHeader from '@/components/AppHeader';
import StatusPageConfig from '@/components/api-monitoring/StatusPageConfig';

export default function StatusPageConfigPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header partagé unifié */}
      <AppHeader />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        <StatusPageConfig />
      </main>
    </div>
  );
}
