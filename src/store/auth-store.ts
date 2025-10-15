import { create } from 'zustand'
import { AuthState, User } from '../types'

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setAuthenticated: (isAuthenticated: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>(set => ({
  isAuthenticated: false,
  user: null,
  token: null,

  setUser: user => set({ user }),
  setToken: token => set({ token }),
  setAuthenticated: isAuthenticated => set({ isAuthenticated }),

  logout: () =>
    set({
      isAuthenticated: false,
      user: null,
      token: null,
    }),
}))
