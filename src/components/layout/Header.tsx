import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { ConnectivityPill } from '../common/ConnectivityPill';
import { getEquipmentState } from '../../services/equipmentStateService';
import { Activity, LogOut, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { equipment, runtimeLogs, schedules, overrideSchedules } = useEquipmentStore();

  const userName = user?.name || user?.email || 'Operator';
  const userRoles = (user?.roles || []).join(', ') || 'Technician';

  // Live operational telemetry counts
  let runningCount = 0;
  let downtimeCount = 0;
  equipment.forEach(eq => {
    const state = getEquipmentState(eq, runtimeLogs, schedules, overrideSchedules);
    if (state.state === 'Running') {
      runningCount++;
    } else if (state.subState === 'Downtime') {
      downtimeCount++;
    }
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md px-4 py-2.5 shadow-xs mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & User Info */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-foreground">
                Operations Dashboard
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <ShieldCheck className="h-2.5 w-2.5" />
                EQRTS
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{userRoles}</span>
              <span>·</span>
              <span className="font-semibold text-foreground">{userName}</span>
            </div>
          </div>
        </div>

        {/* Live Telemetry Pills */}
        <div className="hidden sm:flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1 text-slate-700 font-medium">
            <span>Total:</span>
            <strong className="text-foreground">{equipment.length}</strong>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Running:</span>
            <strong className="font-bold">{runningCount}</strong>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-800 font-medium">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>Down:</span>
            <strong className="font-bold">{downtimeCount}</strong>
          </div>
        </div>

        {/* Connectivity & Logout */}
        <div className="flex items-center gap-2">
          <ConnectivityPill />
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground shadow-xs transition-colors cursor-pointer"
            onClick={logout}
            title="Log out of session"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
