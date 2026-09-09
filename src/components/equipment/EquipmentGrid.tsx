import React, { useMemo } from 'react';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useUIStore } from '../../store/useUIStore';
import { getEquipmentState } from '../../services/equipmentStateService';
import { EquipmentCard } from './EquipmentCard';
import { RefreshCw, Inbox, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';

export const EquipmentGrid: React.FC = () => {
  const { equipment, runtimeLogs, schedules, overrideSchedules, isLoading } = useEquipmentStore();
  const {
    searchQuery,
    systemFilter,
    componentFilter,
    runtimeStateFilter,
    setSystemFilter,
    setComponentFilter,
    setRuntimeStateFilter,
    setSearchQuery
  } = useUIStore();

  const filteredEquipment = useMemo(() => {
    return equipment.filter(eq => {
      // 1. Runtime State Filter (All, Running, Downtime, Off)
      if (runtimeStateFilter !== 'All') {
        const op = getEquipmentState(eq, runtimeLogs, schedules, overrideSchedules);
        if (runtimeStateFilter === 'Running' && op.state !== 'Running') return false;
        if (runtimeStateFilter === 'Downtime' && op.subState !== 'Downtime') return false;
        if (runtimeStateFilter === 'Off' && (op.state === 'Running' || op.subState === 'Downtime')) return false;
      }

      // 2. System Filter
      if (systemFilter && eq["System"] !== systemFilter) return false;

      // 3. Component Filter
      if (componentFilter && eq["Component"] !== componentFilter) return false;

      // 4. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const tag = (eq["Tagging Number"] || eq["Equipment ID"] || '').toLowerCase();
        const name = (eq["Common Name"] || '').toLowerCase();
        const loc = (eq["Location"] || '').toLowerCase();
        const comp = (eq["Component"] || '').toLowerCase();
        const sys = (eq["System"] || '').toLowerCase();
        if (!tag.includes(q) && !name.includes(q) && !loc.includes(q) && !comp.includes(q) && !sys.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [equipment, runtimeLogs, schedules, overrideSchedules, runtimeStateFilter, systemFilter, componentFilter, searchQuery]);

  const handleResetFilters = () => {
    setSystemFilter('');
    setComponentFilter('');
    setRuntimeStateFilter('All');
    setSearchQuery('');
  };

  if (isLoading && equipment.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading equipment directory...</p>
      </div>
    );
  }

  if (filteredEquipment.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-xs my-6 space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Inbox className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-base text-foreground">No Equipment Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            No equipment matches the active filters or search term. Try resetting your filters to view all equipment.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetFilters}
          className="cursor-pointer gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Filters</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 mb-8">
      {filteredEquipment.map(eq => {
        const key = eq["Tagging Number"] || eq["Equipment ID"] || Math.random().toString();
        return <EquipmentCard key={key} equipment={eq} />;
      })}
    </div>
  );
};
