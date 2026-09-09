import { create } from 'zustand';
import { Equipment, RuntimeLog } from '../types';

export type RuntimeStateFilter = 'All' | 'Running' | 'Downtime' | 'Off';

interface UIStore {
  activeTab: 'equipment' | 'schedules' | 'history';
  runtimeStateFilter: RuntimeStateFilter;
  searchQuery: string;
  systemFilter: string;
  componentFilter: string;
  historyFilterAction: string;
  historySystemFilter: string;
  historyMyActionsOnly: boolean;

  // Modals & Drawers
  selectedEquipment: Equipment | null;
  selectedLog: RuntimeLog | null;
  showRoutineModal: boolean;
  routineAction: 'Startup' | 'Shutdown';
  showDowntimeModal: boolean;
  downtimeAction: 'Shutdown' | 'Restart';
  showTimelineModal: boolean;
  previewImageUrl: string | null;

  // Actions
  setActiveTab: (tab: 'equipment' | 'schedules' | 'history') => void;
  setRuntimeStateFilter: (filter: RuntimeStateFilter) => void;
  setSearchQuery: (query: string) => void;
  setSystemFilter: (sys: string) => void;
  setComponentFilter: (comp: string) => void;
  setHistoryFilterAction: (act: string) => void;
  setHistorySystemFilter: (sys: string) => void;
  setHistoryMyActionsOnly: (val: boolean) => void;

  openRoutineModal: (eq: Equipment, action: 'Startup' | 'Shutdown', log?: RuntimeLog | null) => void;
  closeRoutineModal: () => void;
  openDowntimeModal: (eq: Equipment, action: 'Shutdown' | 'Restart') => void;
  closeDowntimeModal: () => void;
  openTimelineModal: (eq: Equipment) => void;
  closeTimelineModal: () => void;
  openImagePreview: (url: string) => void;
  closeImagePreview: () => void;
}

export const useUIStore = create<UIStore>(set => ({
  activeTab: 'equipment',
  runtimeStateFilter: 'All',
  searchQuery: '',
  systemFilter: '',
  componentFilter: '',
  historyFilterAction: 'All',
  historySystemFilter: 'All',
  historyMyActionsOnly: false,

  selectedEquipment: null,
  selectedLog: null,
  showRoutineModal: false,
  routineAction: 'Startup',
  showDowntimeModal: false,
  downtimeAction: 'Shutdown',
  showTimelineModal: false,
  previewImageUrl: null,

  setActiveTab: tab => set({ activeTab: tab }),
  setRuntimeStateFilter: filter => set({ runtimeStateFilter: filter }),
  setSearchQuery: query => set({ searchQuery: query }),
  setSystemFilter: sys => set({ systemFilter: sys, componentFilter: '' }), // Reset component when system changes
  setComponentFilter: comp => set({ componentFilter: comp }),
  setHistoryFilterAction: act => set({ historyFilterAction: act }),
  setHistorySystemFilter: sys => set({ historySystemFilter: sys }),
  setHistoryMyActionsOnly: val => set({ historyMyActionsOnly: val }),

  openRoutineModal: (eq, action, log = null) =>
    set({
      selectedEquipment: eq,
      routineAction: action,
      selectedLog: log,
      showRoutineModal: true
    }),

  closeRoutineModal: () =>
    set({
      showRoutineModal: false,
      selectedEquipment: null,
      selectedLog: null
    }),

  openDowntimeModal: (eq, action) =>
    set({
      selectedEquipment: eq,
      downtimeAction: action,
      showDowntimeModal: true
    }),

  closeDowntimeModal: () =>
    set({
      showDowntimeModal: false,
      selectedEquipment: null
    }),

  openTimelineModal: eq =>
    set({
      selectedEquipment: eq,
      showTimelineModal: true
    }),

  closeTimelineModal: () =>
    set({
      showTimelineModal: false,
      selectedEquipment: null
    }),

  openImagePreview: url => set({ previewImageUrl: url }),
  closeImagePreview: () => set({ previewImageUrl: null })
}));
