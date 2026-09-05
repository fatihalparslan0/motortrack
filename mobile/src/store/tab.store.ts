import { create } from 'zustand';

interface TabState {
  activeTab: number;
  setActiveTab: (index: number) => void;
}

export const useTabStore = create<TabState>((set) => ({
  activeTab: 0,
  setActiveTab: (index) => set({ activeTab: index }),
}));
