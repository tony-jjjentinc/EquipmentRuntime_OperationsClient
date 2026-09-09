import React from 'react';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useUIStore, RuntimeStateFilter } from '../../store/useUIStore';
import { getEquipmentState } from '../../services/equipmentStateService';
import { LayoutGrid, Clock, Search, X, ChevronRight, RotateCcw } from 'lucide-react';
import { Input } from '../ui/input';

export const Navigation: React.FC = () => {
  const { equipment, runtimeLogs, schedules, overrideSchedules } = useEquipmentStore();
  const {
    activeTab,
    setActiveTab,
    runtimeStateFilter,
    setRuntimeStateFilter,
    searchQuery,
    setSearchQuery,
    systemFilter,
    setSystemFilter,
    componentFilter,
    setComponentFilter
  } = useUIStore();

  // Extract unique systems and components
  const uniqueSystems = Array.from(new Set(equipment.map(e => e["System"]).filter(Boolean))) as string[];
  
  // Available components for the selected system
  const availableComponents = systemFilter
    ? (Array.from(new Set(
        equipment
          .filter(e => e["System"] === systemFilter)
          .map(e => e["Component"])
          .filter(Boolean)
      )) as string[])
    : [];

  // System equipment counts
  const systemCounts: Record<string, number> = { All: equipment.length };
  uniqueSystems.forEach(sys => {
    systemCounts[sys] = equipment.filter(e => e["System"] === sys).length;
  });

  // Runtime State counts
  let runningCount = 0;
  let downtimeCount = 0;
  let offCount = 0;

  equipment.forEach(eq => {
    const op = getEquipmentState(eq, runtimeLogs, schedules, overrideSchedules);
    if (op.state === 'Running') {
      runningCount++;
    } else if (op.subState === 'Downtime') {
      downtimeCount++;
    } else {
      offCount++;
    }
  });

  const stateTabs: { key: RuntimeStateFilter; label: string; count: number; colorClass: string; activeClass: string }[] = [
    {
      key: 'All',
      label: 'All Equipment',
      count: equipment.length,
      colorClass: 'text-slate-600 bg-slate-100',
      activeClass: 'bg-primary text-white border-primary shadow-xs'
    },
    {
      key: 'Running',
      label: 'Running',
      count: runningCount,
      colorClass: 'text-emerald-700 bg-emerald-100',
      activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
    },
    {
      key: 'Downtime',
      label: 'Downtime',
      count: downtimeCount,
      colorClass: 'text-rose-700 bg-rose-100',
      activeClass: 'bg-rose-600 text-white border-rose-600 shadow-xs'
    },
    {
      key: 'Off',
      label: 'Off / Standby',
      count: offCount,
      colorClass: 'text-slate-600 bg-slate-100',
      activeClass: 'bg-slate-700 text-white border-slate-700 shadow-xs'
    }
  ];

  return (
    <div className="space-y-3 mb-4">
      {/* Top Bar: View Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* View Tabs */}
        <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1 text-muted-foreground shadow-xs">
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'equipment'
                ? 'bg-background text-foreground shadow-xs'
                : 'hover:text-foreground'
            }`}
            onClick={() => setActiveTab('equipment')}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Equipment ({equipment.length})</span>
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-background text-foreground shadow-xs'
                : 'hover:text-foreground'
            }`}
            onClick={() => setActiveTab('history')}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Activity History</span>
          </button>
        </div>

        {/* Search Input with Clear Button */}
        {activeTab === 'equipment' && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tag, name, room, system..."
              className="pl-8 pr-8 text-xs bg-background"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === 'equipment' && (
        <>
          {/* Tier 2: Runtime Operational State Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {stateTabs.map(tab => {
              const isActive = runtimeStateFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setRuntimeStateFilter(tab.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? tab.activeClass
                      : 'border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[11px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : tab.colorClass
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tier 3: Cascading System & Component Filter Badges */}
          <div className="space-y-1.5">
            {/* System Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  systemFilter === ''
                    ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                    : 'border-border bg-background hover:bg-accent text-muted-foreground'
                }`}
                onClick={() => {
                  setSystemFilter('');
                  setComponentFilter('');
                }}
              >
                <span>All Systems</span>
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    systemFilter === '' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {systemCounts['All'] || 0}
                </span>
              </button>

              {uniqueSystems.map(sys => {
                const isSelected = systemFilter === sys;
                return (
                  <button
                    key={sys}
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                        : 'border-border bg-background hover:bg-accent text-muted-foreground'
                    }`}
                    onClick={() => {
                      setSystemFilter(isSelected ? '' : sys);
                    }}
                  >
                    <span>{sys}</span>
                    <span
                      className={`rounded-full px-1.5 text-[10px] ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {systemCounts[sys] || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Nested Component Chips (Only visible when a system is active) */}
            {systemFilter && availableComponents.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pl-2 py-0.5 border-l-2 border-primary/30">
                <div className="flex items-center text-xs text-muted-foreground font-medium pr-1">
                  <span>Components</span>
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </div>

                <button
                  type="button"
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    componentFilter === ''
                      ? 'border-slate-800 bg-slate-800 text-white'
                      : 'border-border bg-background hover:bg-accent text-muted-foreground'
                  }`}
                  onClick={() => setComponentFilter('')}
                >
                  All Components
                </button>

                {availableComponents.map(comp => {
                  const isSelected = componentFilter === comp;
                  return (
                    <button
                      key={comp}
                      type="button"
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-slate-800 bg-slate-800 text-white'
                          : 'border-border bg-background hover:bg-accent text-muted-foreground'
                      }`}
                      onClick={() => setComponentFilter(isSelected ? '' : comp)}
                    >
                      {comp}
                    </button>
                  );
                })}

                {(systemFilter || componentFilter) && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground pl-1.5 cursor-pointer"
                    onClick={() => {
                      setSystemFilter('');
                      setComponentFilter('');
                    }}
                    title="Clear filter"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
