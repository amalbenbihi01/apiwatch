'use client';

import OverviewWidget from './widgets/OverviewWidget';
import ApiStatusWidget from './widgets/ApiStatusWidget';
import UptimeWidget from './widgets/UptimeWidget';
import ResponseTimeWidget from './widgets/ResponseTimeWidget';
import IncidentsWidget from './widgets/IncidentsWidget';
import ActivityWidget from './widgets/ActivityWidget';
import HealthSummaryWidget from './widgets/HealthSummaryWidget';

const WIDGET_COMPONENTS = {
  overview: OverviewWidget,
  'api-status': ApiStatusWidget,
  uptime: UptimeWidget,
  'response-time': ResponseTimeWidget,
  incidents: IncidentsWidget,
  activity: ActivityWidget,
  'health-summary': HealthSummaryWidget,
};

export default function DashboardGrid({ widgets = [] }) {
  const visibleWidgets = widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order);

  const getColSpanClass = (size) => {
    switch (size) {
      case 'small':
        return 'col-span-1 md:col-span-1 lg:col-span-1';
      case 'medium':
        return 'col-span-1 md:col-span-2 lg:col-span-2';
      case 'large':
      default:
        return 'col-span-1 md:col-span-2 lg:col-span-3';
    }
  };

  if (visibleWidgets.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
        <span className="text-3xl">📭</span>
        <h3 className="text-base font-bold text-white">Aucun widget visible</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Tous vos widgets sont actuellement masqués. Cliquez sur &quot;Personnaliser le Dashboard&quot; pour afficher les métriques de votre choix.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
      {visibleWidgets.map((widget) => {
        const WidgetComponent = WIDGET_COMPONENTS[widget.id];
        if (!WidgetComponent) return null;

        return (
          <div key={widget.id} className={`${getColSpanClass(widget.size)} transition-all duration-200`}>
            <WidgetComponent size={widget.size} />
          </div>
        );
      })}
    </div>
  );
}
