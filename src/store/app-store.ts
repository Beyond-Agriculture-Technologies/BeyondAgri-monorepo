import { create } from 'zustand'
import { Farm, OfflineAction } from '../types'

interface AppStore {
  // Network state
  isOnline: boolean
  setIsOnline: (isOnline: boolean) => void

  // Farms
  farms: Farm[]
  setFarms: (farms: Farm[]) => void
  addFarm: (farm: Farm) => void
  updateFarm: (id: string, farm: Partial<Farm>) => void
  removeFarm: (id: string) => void

  // Offline actions
  offlineActions: OfflineAction[]
  addOfflineAction: (action: OfflineAction) => void
  removeOfflineAction: (id: string) => void
  clearOfflineActions: () => void

  // Loading states
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void

  // Sync status
  isSyncing: boolean
  setIsSyncing: (isSyncing: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  // Network state
  isOnline: true,
  setIsOnline: (isOnline) => set({ isOnline }),

  // Farms
  farms: [],
  setFarms: (farms) => set({ farms }),
  addFarm: (farm) => set((state) => ({ farms: [...state.farms, farm] })),
  updateFarm: (id, updates) => set((state) => ({
    farms: state.farms.map(farm =>
      farm.id === id ? { ...farm, ...updates } : farm
    )
  })),
  removeFarm: (id) => set((state) => ({
    farms: state.farms.filter(farm => farm.id !== id)
  })),

  // Offline actions
  offlineActions: [],
  addOfflineAction: (action) => set((state) => ({
    offlineActions: [...state.offlineActions, action]
  })),
  removeOfflineAction: (id) => set((state) => ({
    offlineActions: state.offlineActions.filter(action => action.id !== id)
  })),
  clearOfflineActions: () => set({ offlineActions: [] }),

  // Loading states
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  // Sync status
  isSyncing: false,
  setIsSyncing: (isSyncing) => set({ isSyncing }),
}))