import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// Types
export interface Modal {
  id: string
  isOpen: boolean
  data?: any
}

export interface UIState {
  // Theme and layout
  theme: 'light' | 'dark' | 'system'
  sidebarCollapsed: boolean
  currentPage: string
  
  // Loading states
  globalLoading: boolean
  loadingStates: Record<string, boolean>
  
  // Modals
  modals: Record<string, Modal>
  
  // Form states
  formStates: Record<string, {
    isDirty: boolean
    isSubmitting: boolean
    errors: Record<string, string>
  }>
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setCurrentPage: (page: string) => void
  
  // Loading actions
  setGlobalLoading: (loading: boolean) => void
  setLoading: (key: string, loading: boolean) => void
  getLoading: (key: string) => boolean
  
  // Modal actions
  openModal: (id: string, data?: any) => void
  closeModal: (id: string) => void
  isModalOpen: (id: string) => boolean
  getModalData: (id: string) => any
  
  // Form actions
  setFormState: (formId: string, state: Partial<UIState['formStates'][string]>) => void
  getFormState: (formId: string) => UIState['formStates'][string]
  clearFormState: (formId: string) => void
  
  // Utility actions
  reset: () => void
}

// Default form state
const defaultFormState = {
  isDirty: false,
  isSubmitting: false,
  errors: {},
}

// Store implementation
export const useUIStore = create<UIState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    theme: 'system',
    sidebarCollapsed: false,
    currentPage: 'config',
    globalLoading: false,
    loadingStates: {},
    modals: {},
    formStates: {},

    // Theme and layout actions
    setTheme: (theme) => {
      set({ theme })
      // Apply theme to document
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        root.classList.add(systemTheme)
      } else {
        root.classList.add(theme)
      }
      
      // Persist to localStorage
      localStorage.setItem('ai-voice-agent-theme', theme)
    },

    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    setCurrentPage: (page) => set({ currentPage: page }),

    // Loading actions
    setGlobalLoading: (loading) => set({ globalLoading: loading }),

    setLoading: (key, loading) => 
      set((state) => ({
        loadingStates: { ...state.loadingStates, [key]: loading }
      })),

    getLoading: (key) => get().loadingStates[key] || false,

    // Modal actions
    openModal: (id, data) =>
      set((state) => ({
        modals: { ...state.modals, [id]: { id, isOpen: true, data } }
      })),

    closeModal: (id) =>
      set((state) => ({
        modals: { ...state.modals, [id]: { ...state.modals[id], isOpen: false } }
      })),

    isModalOpen: (id) => get().modals[id]?.isOpen || false,
    getModalData: (id) => get().modals[id]?.data,

    // Form actions
    setFormState: (formId, formState) =>
      set((state) => ({
        formStates: {
          ...state.formStates,
          [formId]: { ...defaultFormState, ...state.formStates[formId], ...formState }
        }
      })),

    getFormState: (formId) => get().formStates[formId] || defaultFormState,

    clearFormState: (formId) =>
      set((state) => ({
        formStates: { ...state.formStates, [formId]: defaultFormState }
      })),

    // Utility actions
    reset: () => set({
      globalLoading: false,
      loadingStates: {},
      modals: {},
      formStates: {},
    }),
  }))
)

// Selectors for optimized re-renders
export const uiSelectors = {
  theme: (state: UIState) => state.theme,
  sidebarCollapsed: (state: UIState) => state.sidebarCollapsed,
  currentPage: (state: UIState) => state.currentPage,
  globalLoading: (state: UIState) => state.globalLoading,
}

// Higher-order selectors
export const createLoadingSelector = (key: string) => (state: UIState) => state.getLoading(key)
export const createModalSelector = (id: string) => (state: UIState) => state.isModalOpen(id)
export const createFormSelector = (formId: string) => (state: UIState) => state.getFormState(formId)
