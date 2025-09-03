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
  fetchCalls: () => Promise<void>
  fetchCallDetails: (callId: string) => Promise<Call | null>
  fetchCallStats: () => Promise<void>
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
        // Initial state - Start empty, fetch from API
        calls: [],
        selectedCall: null,
        isLoading: false,
        error: null,
        searchTerm: '',
        statusFilter: 'all',
        activeCall: null,
        callProgress: 0,

    // Actions
    setCalls: (calls) => set({ calls }),

    // Fetch calls from backend
    fetchCalls: async () => {
      console.log('🔄 Fetching calls from API...')
      set({ isLoading: true, error: null })
      try {
        const backendCalls = await callApi.getAll()
        console.log('📊 Raw response from backend:', backendCalls)
        console.log('📊 Response type:', typeof backendCalls, 'Length:', Array.isArray(backendCalls) ? backendCalls.length : 'not an array')
        
        // Convert backend snake_case responses to frontend camelCase format
        const calls: Call[] = backendCalls.map((backendCall: any) => ({
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
          },
          transcript: backendCall.transcript || [],
          pickupLocation: backendCall.pickup_location,
          deliveryLocation: backendCall.delivery_location,
          estimatedPickupTime: backendCall.estimated_pickup_time,
          notes: backendCall.notes,
        }))
        
        set({ calls, isLoading: false })
        console.log(`✅ Loaded ${calls.length} calls from Retell AI API (fresh data)`)
        
        if (calls.length === 0) {
          console.log('ℹ️ No calls found. This means either:')
          console.log('   1. No calls have been made through the system yet')
          console.log('   2. Retell AI API key might need verification')
          console.log('   3. Calls exist but are not being mapped correctly')
          console.log('💡 Try making a test call from the Call Trigger page first')
        }
      } catch (error) {
        console.error('❌ Failed to fetch calls:', error)
        set({ error: 'Failed to load calls', isLoading: false })
      }
    },

    fetchCallDetails: async (callId: string): Promise<Call | null> => {
      console.log(`🔍 Fetching detailed call data for ${callId}...`)
      try {
        const backendCall = await callApi.getById(callId)
        
        // Convert backend snake_case response to frontend camelCase format
        const detailedCall: Call = {
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
          },
          transcript: backendCall.transcript || [],
          pickupLocation: backendCall.pickup_location,
          deliveryLocation: backendCall.delivery_location,
          estimatedPickupTime: backendCall.estimated_pickup_time,
          notes: backendCall.notes,
        }
        
        // Update the call in the store with the detailed data
        get().updateCall(callId, detailedCall)
        
        console.log(`✅ Loaded detailed call data for ${callId}`)
        return detailedCall
      } catch (error) {
        console.error(`❌ Failed to fetch call details for ${callId}:`, error)
        return null
      }
    },

    fetchCallStats: async () => {
      console.log('📊 Fetching call stats from API...')
      try {
        const stats = await callApi.getStats()
        console.log('✅ Loaded call stats:', stats)
        // Note: You might want to store stats in state if needed
      } catch (error) {
        console.error('❌ Failed to fetch call stats:', error)
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
      console.log(`📋 STORE: Added new call - ${newCall.id}`);
      return newCall
    },

    updateCall: (id, updates) => {
      console.log(`💾 ZUSTAND STORE: Updating call ${id} with:`, updates);
      set((state) => {
        const updatedCalls = state.calls.map((call) =>
          call.id === id ? { ...call, ...updates } : call
        );
        console.log(`✅ ZUSTAND STORE: Call ${id} updated successfully. Total calls in store: ${updatedCalls.length}`);
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
      console.log('📞 Initiating call via API...')
      set({ isLoading: true, error: null })
      
      try {
        // Call the backend API to create/initiate the call
        const backendResponse = await callApi.create(callData)
        
        // Convert backend snake_case response to frontend camelCase format
        const newCall: Call = {
          id: backendResponse.id,
          driver: backendResponse.driver_name || callData.driver,
          phone: backendResponse.phone_number || callData.phone,
          loadNumber: backendResponse.load_number || callData.loadNumber,
          agentId: backendResponse.agent_id || callData.agentId,
          agent: callData.agent,
          scenario: backendResponse.scenario || callData.scenario,
          status: backendResponse.status || 'pending',
          duration: backendResponse.duration || '0:00',
          timestamp: backendResponse.timestamp || new Date().toISOString(),
          outcome: backendResponse.outcome || 'Call initiated...',
          confidence: backendResponse.confidence || 0,
          extractedData: {
            currentLocation: backendResponse.extracted_data?.current_location || '',
            estimatedArrival: backendResponse.extracted_data?.estimated_arrival || '',
            driverStatus: backendResponse.extracted_data?.driver_status || '',
            issues: backendResponse.extracted_data?.issues || '',
          },
          transcript: backendResponse.transcript || [],
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
        }))

        console.log(`✅ Call initiated: ${newCall.id}`)
        console.log(`📊 Call outcome: ${newCall.outcome}`)

        // Since this is a demo, the call is already "completed" by the backend
        // In real integration, this would be handled by webhooks
        set({ activeCall: null, callProgress: 100 })

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
      console.log(`📞 STORE: Call ended - ${callId}`);
      
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
      console.log(`📞 STORE: Call analyzed - ${callId}`);
      
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
          console.log(`🗑️ Cleared ${key} from localStorage`);
        });
        
        console.log('✅ All localStorage cleared - fetching fresh data from API');
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
