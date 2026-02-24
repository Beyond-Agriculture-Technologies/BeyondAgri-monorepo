import { create } from 'zustand'
import { AuthState, User, RegistrationSession } from '../types'

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setAuthenticated: (isAuthenticated: boolean) => void
  logout: () => void

  // Registration Session State
  registrationSession: RegistrationSession | null
  setRegistrationSession: (session: RegistrationSession | null) => void
}

export const useAuthStore = create<AuthStore>(set => ({
  isAuthenticated: false,
  user: null,
  token: null,
  registrationSession: null,

  setUser: user => set({ user }),
  setToken: token => set({ token }),
  setAuthenticated: isAuthenticated => set({ isAuthenticated }),
  setRegistrationSession: session => set({ registrationSession: session }),

  logout: () =>
    set({
      isAuthenticated: false,
      user: null,
      token: null,
      registrationSession: null,
    }),
}))
