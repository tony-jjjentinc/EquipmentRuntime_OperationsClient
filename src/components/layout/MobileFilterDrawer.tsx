import React from 'react';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useUIStore, RuntimeStateFilter } from '../../store/useUIStore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '../ui/sheet';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, RotateCcw, X, SlidersHorizontal, Check } from 'lucide-react';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({ isOpen, onClose }) => {
  const { equipment } = useEquipmentStore();
  const {
    searchQuery,
    setSearchQuery,
    runtimeStateFilter,
    setRuntimeStateFilter,
    systemFilter,
    setSystemFilter,
    componentFilter,
    setComponentFilter
  } = useUIStore();

  const uniqueSystems = Array.from(new Set(equipment.map(e => e["System"]).filter(Boolean))) as string[];
  const availableComponents = systemFilter
    ? (Array.from(new Set(
        equipment
          .filter(e => e["System"] === systemFilter)
          .map(e => e["Component"])
          .filter(Boolean)
      )) as string[])
    : [];

  const handleReset = () => {
    setSearchQuery('');
    setRuntimeStateFilter('All');
    setSystemFilter('');
    setComponentFilter('');
  };

  const states: { key: RuntimeStateFilter; label: string }[] = [
    { key: 'All', label: 'All Equipment' },
    { key: 'Running', label: 'Running Only' },
    { key: 'Downtime', label: 'Downtime Only' },
    { key: 'Off', label: 'Standby / Off' }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto px-4 py-5">
        <SheetHeader className="border-b border-border pb-3 mb-4">
          <SheetTitle className="text-base font-bold flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span>Filter Equipment Fleet</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Quickly filter equipment by operational state, system classification, or component.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 text-xs">
          {/* Search Input */}
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase text-[11px] tracking-wider">
              Search Text
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search tag, name, room, system..."
                className="pl-9 text-xs"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Runtime State Filter */}
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase text-[11px] tracking-wider">
              Operational State
            </label>
            <div className="grid grid-cols-2 gap-2">
              {states.map(st => {
                const isSelected = runtimeStateFilter === st.key;
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setRuntimeStateFilter(st.key)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border font-medium text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border bg-card hover:bg-accent text-foreground'
                    }`}
                  >
                    <span>{st.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* System Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-muted-foreground uppercase text-[11px] tracking-wider">
                System Division
              </label>
              {systemFilter && (
                <button
                  type="button"
                  onClick={() => setSystemFilter('')}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  Clear System
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border border-border/40 rounded-xl bg-muted/20">
              <button
                type="button"
                onClick={() => setSystemFilter('')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                  !systemFilter
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-muted-foreground'
                }`}
              >
                All Systems
              </button>
              {uniqueSystems.map(sys => {
                const isSelected = systemFilter === sys;
                return (
                  <button
                    key={sys}
                    type="button"
                    onClick={() => setSystemFilter(sys)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'bg-card border border-border text-foreground hover:bg-accent'
                    }`}
                  >
                    {sys}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Component Selection if System Active */}
          {systemFilter && availableComponents.length > 0 && (
            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground uppercase text-[11px] tracking-wider">
                Component Subsystem
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 border border-border/40 rounded-xl bg-muted/20">
                <button
                  type="button"
                  onClick={() => setComponentFilter('')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                    !componentFilter
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-muted-foreground'
                  }`}
                >
                  All Components
                </button>
                {availableComponents.map(comp => {
                  const isSelected = componentFilter === comp;
                  return (
                    <button
                      key={comp}
                      type="button"
                      onClick={() => setComponentFilter(comp)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-bold'
                          : 'bg-card border border-border text-foreground hover:bg-accent'
                      }`}
                    >
                      {comp}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-6 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-muted-foreground gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="text-xs px-6 font-bold"
          >
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
