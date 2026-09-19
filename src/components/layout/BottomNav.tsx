import React from 'react';
import { useUIStore } from '../../store/useUIStore';
import { LayoutGrid, Clock, SlidersHorizontal, Activity } from 'lucide-react';

interface BottomNavProps {
  onOpenSyncHealth: () => void;
  onOpenFilters: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenSyncHealth, onOpenFilters }) => {
  const { activeTab, setActiveTab } = useUIStore();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md px-2 py-1 shadow-lg">
      <div className="grid grid-cols-4 items-center gap-1">
        {/* Tab 1: Equipment Fleet */}
        <button
          type="button"
          onClick={() => setActiveTab('equipment')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'equipment'
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutGrid className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Fleet</span>
        </button>

        {/* Tab 2: Activity Feed */}
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Activity</span>
        </button>

        {/* Tab 3: Filter / Search Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenFilters}
          className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Filters</span>
        </button>

        {/* Tab 4: Sync Health Center */}
        <button
          type="button"
          onClick={onOpenSyncHealth}
          className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Activity className="h-5 w-5 mb-0.5 text-emerald-600" />
          <span className="text-[10px] tracking-tight">Sync</span>
        </button>
      </div>
    </nav>
  );
};
