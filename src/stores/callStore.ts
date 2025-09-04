import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { callApi } from '../services/api'

// Types
export interface CallTranscriptEntry {
  speaker: 'Agent' | 'Driver' | 'System'
  text: string
  timestamp: string
}

export interface ExtractedData {
  currentLocation?: string
  estimatedArrival?: string
  driverStatus?: string
  issues?: string
  [key: string]: any
}

export interface Call {
  id: string
  driver: string
  phone: string
  loadNumber: string
  agent: string
  agentId: string
  scenario: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled'
  duration: string
  timestamp: string
  outcome: string
  confidence: number
  extractedData: ExtractedData
  transcript: CallTranscriptEntry[]
  pickupLocation?: string
  deliveryLocation?: string
  estimatedPickupTime?: string
  notes?: string
}

export interface CallState {
  // State
  calls: Call[]
  selectedCall: Call | null
  isLoading: boolean
  error: string | null
  searchTerm: string
  statusFilter: string
  lastFetched: number | null // Timestamp of last successful fetch
  
  // Real-time call state
  activeCall: Call | null
  callProgress: number
  
  // Actions
  setCalls: (calls: Call[]) => void
  addCall: (call: Omit<Call, 'id' | 'timestamp'>) => Call
  updateCall: (id: string, updates: Partial<Call>) => void
  deleteCall: (id: string) => void
  selectCall: (call: Call | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSearchTerm: (term: string) => void
  setStatusFilter: (status: string) => void
  
  // Call management
  initiateCall: (callData: Omit<Call, 'id' | 'timestamp' | 'status' | 'confidence' | 'transcript' | 'extractedData' | 'outcome'>) => Promise<void>
  endCall: (id: string, outcome: string, extractedData: ExtractedData, transcript: CallTranscriptEntry[]) => void
  cancelCall: (id: string) => void
  fetchCalls: (forceRefresh?: boolean) => Promise<void>
  ensureCallsLoaded: () => Promise<void>
  invalidateCache: () => void
  fetchCallDetails: (callId: string) => Promise<Call | null>
  clearLocalStorage: () => void
  
  // Webhook event handlers
  handleCallStarted: (callId: string, callData: any) => void
  handleCallEnded: (callId: string, callData: any) => void
  handleCallAnalyzed: (callId: string, analysisData: any) => void
  
  // Computed getters
  getCallById: (id: string) => Call | undefined
  getFilteredCalls: () => Call[]
  getCallStats: () => {
    total: number
    completed: number
    failed: number
    inProgress: number
    successRate: number
    avgDuration: string
    avgConfidence: number
  }
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
const STORAGE_KEY = 'retell_calls_cache';

// Load cached data from localStorage
const loadCachedCalls = (): { calls: Call[]; lastFetched: number } | null => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      // Check if cache is still valid (within CACHE_DURATION)
      if (Date.now() - data.lastFetched < CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.warn('Failed to load cached calls:', error);
  }
  return null;
};

// Save data to localStorage
const saveCachedCalls = (calls: Call[], lastFetched: number) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ calls, lastFetched }));
  } catch (error) {
    console.warn('Failed to save calls to cache:', error);
  }
};

// Helper function to map backend call to frontend format
const mapBackendCallToFrontend = (backendCall: any): Call => ({
  id: backendCall.id,
  driver: backendCall.driver_name,
  phone: backendCall.phone_number,
  loadNumber: backendCall.load_number,
  agentId: backendCall.agent_id,
  agent: backendCall.agent_name || 'Unknown Agent',
  scenario: backendCall.scenario,
  status: backendCall.status,
  duration: backendCall.duration,
  timestamp: backendCall.timestamp,
  outcome: backendCall.outcome,
  confidence: backendCall.confidence,
  extractedData: {
    currentLocation: backendCall.extracted_data?.current_location || '',
    estimatedArrival: backendCall.extracted_data?.estimated_arrival || '',
    driverStatus: backendCall.extracted_data?.driver_status || '',
    issues: backendCall.extracted_data?.issues || '',
    ...backendCall.extracted_data // Preserve any additional fields
  },
  transcript: backendCall.transcript || [],
  pickupLocation: backendCall.pickup_location,
  deliveryLocation: backendCall.delivery_location,
  estimatedPickupTime: backendCall.estimated_pickup_time,
  notes: backendCall.notes,
});

// Initialize with cached data if available
const cachedData = loadCachedCalls();

// Helper functions
const calculateDuration = (start: Date, end: Date): string => {
  const diff = Math.floor((end.getTime() - start.getTime()) / 1000)
  const minutes = Math.floor(diff / 60)
  const seconds = diff % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const calculateSuccessRate = (calls: Call[]): number => {
  if (calls.length === 0) return 0
  
  const successful = calls.filter(call => {
    // Call must be completed (not failed/cancelled/in-progress)
    if (call.status !== 'completed') return false
    
    // Consider successful if:
    // 1. Explicitly marked as successful in analysis data, OR
    // 2. High confidence score (>= 0.7), OR  
    // 3. Fallback: any completed call (for calls without analysis)
    return (
      call.extractedData?.successful === true ||
      call.confidence >= 0.7 ||
      (call.extractedData?.successful === undefined && call.confidence === 0)
    )
  }).length
  
  return Math.round((successful / calls.length) * 100)
}

const calculateAvgDuration = (calls: Call[]): string => {
  const completedCalls = calls.filter(c => c.status === 'completed')
  if (completedCalls.length === 0) return '0:00'
  
  const totalSeconds = completedCalls.reduce((sum, call) => {
    const [minutes, seconds] = call.duration.split(':').map(Number)
    return sum + (minutes * 60) + seconds
  }, 0)
  
  const avgSeconds = Math.floor(totalSeconds / completedCalls.length)
  const minutes = Math.floor(avgSeconds / 60)
  const seconds = avgSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const calculateAvgConfidence = (calls: Call[]): number => {
  const completedCalls = calls.filter(c => c.status === 'completed' && c.confidence > 0)
  if (completedCalls.length === 0) return 0
  
  const totalConfidence = completedCalls.reduce((sum, call) => sum + call.confidence, 0)
  return Math.round((totalConfidence / completedCalls.length) * 100)
}

// Store implementation
export const useCallStore = create<CallState>()(
  subscribeWithSelector(
    (set, get) => ({
        // Initial state - Start with cached data, load from API if cache is stale
        calls: cachedData?.calls || [],
        selectedCall: null,
        isLoading: false,
        error: null,
        searchTerm: '',
        statusFilter: 'all',
        lastFetched: cachedData?.lastFetched || null,
        activeCall: null,
        callProgress: 0,

    // Actions
    setCalls: (calls) => set({ calls }),

    // Fetch calls from backend with caching
    fetchCalls: async (forceRefresh = false) => {
      const { isLoading, lastFetched } = get();
      
      // Don't fetch if already loading
      if (isLoading) return;
      
      // Check if we have fresh cache (unless forcing refresh)
      if (!forceRefresh && lastFetched && (Date.now() - lastFetched < CACHE_DURATION)) {
        return;
      }
      set({ isLoading: true, error: null });
      try {
        const backendCalls = await callApi.getAll();
        
        // Convert backend snake_case responses to frontend camelCase format
        const calls: Call[] = backendCalls.map(mapBackendCallToFrontend);
        const timestamp = Date.now();
        
        set({ calls, isLoading: false, lastFetched: timestamp, error: null });
        
        // Save to localStorage
        saveCachedCalls(calls, timestamp);
      } catch (error) {
        console.error('❌ Failed to fetch calls:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load calls', 
          isLoading: false 
        });
      }
    },

    ensureCallsLoaded: async () => {
      const { lastFetched, isLoading } = get();
      
      // Only fetch if we don't have fresh data and not currently loading
      const isCacheValid = lastFetched && (Date.now() - lastFetched < CACHE_DURATION);
      if (!isCacheValid && !isLoading) {
        await get().fetchCalls();
      }
    },

    invalidateCache: () => {
      localStorage.removeItem(STORAGE_KEY);
      set({ lastFetched: null });
    },

    fetchCallDetails: async (callId: string): Promise<Call | null> => {
      try {
        const backendCall = await callApi.getById(callId);
        
        // Convert backend snake_case response to frontend camelCase format
        const detailedCall: Call = mapBackendCallToFrontend(backendCall);
        
        // Update the call in the store with the detailed data
        get().updateCall(callId, detailedCall);
        
        // Update cache with the detailed call data
        const { calls, lastFetched } = get();
        if (lastFetched) {
          saveCachedCalls(calls, lastFetched);
        }
        
        return detailedCall;
      } catch (error) {
        console.error(`❌ Failed to fetch call details for ${callId}:`, error);
        return null;
      }
    },

    addCall: (callData) => {
      const newCall: Call = {
        ...callData,
        id: `call-${Date.now()}`,
        timestamp: new Date().toISOString(),
      }
      set((state) => ({
        calls: [newCall, ...state.calls], // Add to beginning for chronological order
      }))
      return newCall
    },

    updateCall: (id, updates) => {
      set((state) => {
        const updatedCalls = state.calls.map((call) =>
          call.id === id ? { ...call, ...updates } : call
        );
        return { calls: updatedCalls };
      })
    },

    deleteCall: (id) => {
      set((state) => ({
        calls: state.calls.filter((call) => call.id !== id),
        selectedCall: state.selectedCall?.id === id ? null : state.selectedCall,
      }))
    },

    selectCall: (call) => set({ selectedCall: call }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    setSearchTerm: (term) => set({ searchTerm: term }),
    setStatusFilter: (status) => set({ statusFilter: status }),

    // Call management - DEMO API INTEGRATION
    initiateCall: async (callData) => {
      set({ isLoading: true, error: null })
      
      try {
        // Call the backend API to create/initiate the call
        const backendResponse = await callApi.create(callData)
        
        // Convert backend snake_case response to frontend camelCase format
        const newCall: Call = {
          ...mapBackendCallToFrontend(backendResponse),
          // Override with any provided callData if backend doesn't have it
          driver: backendResponse.driver_name || callData.driver,
          phone: backendResponse.phone_number || callData.phone,
          loadNumber: backendResponse.load_number || callData.loadNumber,
          agentId: backendResponse.agent_id || callData.agentId,
          agent: callData.agent,
          pickupLocation: backendResponse.pickup_location || callData.pickupLocation,
          deliveryLocation: backendResponse.delivery_location || callData.deliveryLocation,
          estimatedPickupTime: backendResponse.estimated_pickup_time || callData.estimatedPickupTime,
          notes: backendResponse.notes || callData.notes,
        }
        
        // Add call to state and set as active
        set((state) => ({
          calls: [newCall, ...state.calls],
          activeCall: newCall,
          callProgress: 0,
          isLoading: false
        }));

        // Invalidate cache since we have new data
        get().invalidateCache();

        // Since this is a demo, the call is already "completed" by the backend
        // In real integration, this would be handled by webhooks
        set({ activeCall: null, callProgress: 100 });

      } catch (error) {
        console.error('❌ Failed to initiate call:', error)
        set({ error: 'Failed to initiate call', isLoading: false })
      }
    },

    endCall: (id, outcome, extractedData, transcript) => {
      const call = get().getCallById(id)
      if (call) {
        get().updateCall(id, {
          status: 'completed',
          outcome,
          extractedData,
          transcript,
          duration: calculateDuration(new Date(call.timestamp), new Date()),
        })
      }
      set({ activeCall: null })
    },

    cancelCall: (id) => {
      get().updateCall(id, { status: 'cancelled', outcome: 'Call cancelled by user' })
      set({ activeCall: null })
    },

    // Webhook event handlers - these will be called when webhook events are received
    handleCallStarted: (callId, callData) => {
      console.log(`📞 STORE: Call started - ${callId}`);
      
      // Find existing call by callId or create new one
      const existingCall = get().calls.find(c => c.id === callId);
      if (existingCall) {
        get().updateCall(callId, {
          status: 'in-progress',
          outcome: `Call in progress with ${callData.from_number || 'unknown number'}`,
          duration: '0:00'
        });
      } else {
        // Create new call entry if it doesn't exist
        const newCall = {
          driver: callData.retell_llm_dynamic_variables?.driver_name || 'Unknown Driver',
          phone: callData.to_number || callData.from_number || 'Unknown',
          loadNumber: callData.retell_llm_dynamic_variables?.load_number || 'Unknown Load',
          agent: 'Retell AI Agent',
          agentId: callData.agent_id || 'unknown',
          scenario: callData.retell_llm_dynamic_variables?.scenario || 'incoming_call',
          status: 'in-progress' as const,
          duration: '0:00',
          outcome: `Call started - ${callData.direction || 'unknown'} call`,
          confidence: 0,
          extractedData: {},
          transcript: [],
        };
        
        const call = get().addCall(newCall);
        // Update with the actual retell call ID
        get().updateCall(call.id, { id: callId });
      }
      
      set({ activeCall: get().getCallById(callId) });
    },

    handleCallEnded: (callId, callData) => {
      
      const duration = callData.duration_ms ? 
        `${Math.floor(callData.duration_ms / 60000)}:${Math.floor((callData.duration_ms % 60000) / 1000).toString().padStart(2, '0')}` : 
        '0:00';
      
      // Convert transcript from webhook to store format
      const transcript = (callData.transcript_object || []).map((entry: any) => ({
        speaker: entry.role === 'agent' ? 'Agent' : 'Driver',
        text: entry.content || '',
        timestamp: entry.start ? `${Math.floor(entry.start / 60)}:${Math.floor(entry.start % 60).toString().padStart(2, '0')}` : '00:00'
      }));

      get().updateCall(callId, {
        status: 'completed',
        duration,
        outcome: `Call completed - ${callData.disconnection_reason || 'normal hangup'}`,
        transcript,
        extractedData: callData.extracted_data || {}
      });
      
      set({ activeCall: null });
    },

    handleCallAnalyzed: (callId, analysisData) => {
      const analysis = analysisData.call_analysis || {};
      get().updateCall(callId, {
        confidence: analysis.call_successful ? 0.95 : 0.3,
        outcome: analysis.call_summary || 'Call analysis completed',
        extractedData: {
          ...get().getCallById(callId)?.extractedData,
          sentiment: analysis.user_sentiment,
          summary: analysis.call_summary,
          successful: analysis.call_successful,
          ...analysis.custom_analysis_data
        }
      });
    },

    // Computed getters
    getCallById: (id) => {
      return get().calls.find((call) => call.id === id)
    },

    getFilteredCalls: () => {
      const { calls, searchTerm, statusFilter } = get()
      return calls.filter(call => {
        const matchesSearch = searchTerm === '' || 
          call.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
          call.loadNumber.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesFilter = statusFilter === 'all' || call.status === statusFilter
        return matchesSearch && matchesFilter
      })
    },

    getCallStats: () => {
      const calls = get().calls
      const completed = calls.filter(c => c.status === 'completed').length
      const failed = calls.filter(c => c.status === 'failed').length
      const inProgress = calls.filter(c => c.status === 'in-progress').length
      
      return {
        total: calls.length,
        completed,
        failed,
        inProgress,
        successRate: calculateSuccessRate(calls),
        avgDuration: calculateAvgDuration(calls),
        avgConfidence: calculateAvgConfidence(calls),
      }
    },

    // Clear localStorage function
    clearLocalStorage: () => {
      try {
        // Clear the call-store key
        localStorage.removeItem('call-store');
        
        // Clear any other potential Retell-related localStorage keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('call') || key.includes('retell') || key.includes('agent'))) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
      } catch (error) {
        console.error('❌ Failed to clear localStorage:', error);
      }
    },
      })
  )
)

// Selectors for optimized re-renders
export const callSelectors = {
  calls: (state: CallState) => state.calls,
  selectedCall: (state: CallState) => state.selectedCall,
  activeCall: (state: CallState) => state.activeCall,
  callProgress: (state: CallState) => state.callProgress,
  isLoading: (state: CallState) => state.isLoading,
  error: (state: CallState) => state.error,
  searchTerm: (state: CallState) => state.searchTerm,
  statusFilter: (state: CallState) => state.statusFilter,
  // Note: Remove computed selectors to avoid infinite loops
  // Use the functions directly in components: useCallStore((state) => state.getFilteredCalls())
}
