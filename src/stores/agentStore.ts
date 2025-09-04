import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { agentApi } from '../services/api'

// Types
export interface Agent {
  id: string
  name: string
  description: string
  voice: string
  temperature: number
  speed: number
  volume: number
  prompt: string
  backchannelEnabled: boolean
  backchannelFrequency: number
  backchannelWords: string[]
  interruptionSensitivity: number
  responsiveness: number
  pronunciation: Array<{ word: string; pronunciation: string }>
  boostedKeywords: string[]
  status: 'active' | 'inactive' | 'draft'
  createdAt: string
  updatedAt: string
  callsToday: number
}

export interface AgentState {
  // State
  agents: Agent[]
  selectedAgent: Agent | null
  isLoading: boolean
  error: string | null
  lastFetched: number | null // Timestamp of last successful fetch
  
  // Actions
  setAgents: (agents: Agent[]) => void
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'callsToday'>) => Promise<void>
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>
  deleteAgent: (id: string) => Promise<void>
  selectAgent: (agent: Agent | null) => void
  duplicateAgent: (id: string) => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  fetchAgents: (forceRefresh?: boolean) => Promise<void>
  ensureAgentsLoaded: () => Promise<void>
  invalidateCache: () => void
  
  // Computed getters
  getAgentById: (id: string) => Agent | undefined
  getActiveAgents: () => Agent[]
  getAgentStats: () => {
    total: number
    active: number
    totalCallsToday: number
  }
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
const STORAGE_KEY = 'retell_agents_cache';

// Load cached data from localStorage
const loadCachedAgents = (): { agents: Agent[]; lastFetched: number } | null => {
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
    console.warn('Failed to load cached agents:', error);
  }
  return null;
};

// Save data to localStorage
const saveCachedAgents = (agents: Agent[], lastFetched: number) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ agents, lastFetched }));
  } catch (error) {
    console.warn('Failed to save agents to cache:', error);
  }
};

// Helper function to map Retell API response to frontend format  
const mapBackendAgentToFrontend = (retellAgent: any): Agent => {
  // Extract prompt from agent data (backend should include this)
  const prompt = retellAgent.prompt || 
                 retellAgent.response_engine?.general_prompt || 
                 retellAgent.response_engine?.prompt || 
                 retellAgent.general_prompt ||
                 ''
  
  // Map pronunciation dictionary from Retell format to frontend format
  const pronunciation = retellAgent.pronunciation_dictionary?.map((p: any) => ({
    word: p.word,
    pronunciation: p.phoneme
  })) || []

  return {
    id: retellAgent.agent_id,
    name: retellAgent.agent_name || 'Unknown Agent',
    description: retellAgent.description || `Agent using ${retellAgent.response_engine?.type || 'unknown'} response engine`,
    voice: retellAgent.voice_id || 'alloy',
    temperature: retellAgent.voice_temperature || 0.7,
    speed: retellAgent.voice_speed || 1.0,
    volume: retellAgent.volume || 1.0,
    prompt: prompt,
    backchannelEnabled: retellAgent.enable_backchannel ?? true,
    backchannelFrequency: retellAgent.backchannel_frequency || 0.8,
    backchannelWords: retellAgent.backchannel_words || ['mm-hmm', 'okay', 'I see', 'right'],
    interruptionSensitivity: retellAgent.interruption_sensitivity || 0.7,
    responsiveness: retellAgent.responsiveness || 0.9,
    pronunciation: pronunciation,
    boostedKeywords: retellAgent.boosted_keywords || [],
    status: retellAgent.is_published ? 'active' : 'draft',
    createdAt: retellAgent.created_at || new Date(retellAgent.last_modification_timestamp || Date.now()).toISOString(),
    updatedAt: retellAgent.updated_at || new Date(retellAgent.last_modification_timestamp || Date.now()).toISOString(),
    callsToday: retellAgent.calls_today || 0,
  }
}

// Initialize with cached data if available
const cachedData = loadCachedAgents();

// Store implementation
export const useAgentStore = create<AgentState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state - Start with cached data, load from API if cache is stale
    agents: cachedData?.agents || [],
    selectedAgent: null,
    isLoading: false,
    error: null,
    lastFetched: cachedData?.lastFetched || null,

    // Actions
    setAgents: (agents) => set({ agents }),

    fetchAgents: async (forceRefresh = false) => {
      const { isLoading, lastFetched } = get();
      
      // Don't fetch if already loading
      if (isLoading) return;
      
      // Check if we have fresh cache (unless forcing refresh)
      if (!forceRefresh && lastFetched && (Date.now() - lastFetched < CACHE_DURATION)) {
        return;
      }

      set({ isLoading: true, error: null });
      try {
        const backendAgents = await agentApi.getAll()
        
        // Map backend snake_case response to frontend camelCase
        const mappedAgents: Agent[] = backendAgents.map(mapBackendAgentToFrontend)
        const timestamp = Date.now();
        
        set({ agents: mappedAgents, isLoading: false, lastFetched: timestamp, error: null });
        
        // Save to localStorage
        saveCachedAgents(mappedAgents, timestamp);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load agents from API', 
          isLoading: false 
        });
      }
    },

    addAgent: async (agentData) => {
      set({ isLoading: true, error: null })
      try {
        // Convert frontend format to Retell API format
        const retellAgentData = {
          agent_name: agentData.name,
          description: agentData.description,
          prompt: agentData.prompt,  // Include the prompt for LLM creation
          voice_id: agentData.voice,
          voice_temperature: agentData.temperature,
          voice_speed: agentData.speed,
          volume: agentData.volume,
          responsiveness: agentData.responsiveness,
          interruption_sensitivity: agentData.interruptionSensitivity,
          enable_backchannel: agentData.backchannelEnabled,
          backchannel_frequency: agentData.backchannelFrequency,
          backchannel_words: agentData.backchannelWords,
          boosted_keywords: agentData.boostedKeywords,
          pronunciation_dictionary: agentData.pronunciation.filter(p => p.word && p.pronunciation).map(p => ({
            word: p.word,
            alphabet: "ipa",
            phoneme: p.pronunciation
          })),
          normalize_for_speech: true,
          language: "en-US"
        }
        
        const backendAgent = await agentApi.create(retellAgentData)
        
        // Map response back to frontend format
        const newAgent = mapBackendAgentToFrontend(backendAgent)
        
        set((state) => ({
          agents: [...state.agents, newAgent],
          isLoading: false
        }))
        
        // Invalidate cache and refresh from API to get latest data
        get().invalidateCache();
        await get().fetchAgents(true);
      } catch (error) {
        set({ error: 'Failed to create agent', isLoading: false })
        throw error
      }
    },

    updateAgent: async (id, updates) => {
      set({ isLoading: true, error: null })
      try {
        // Convert frontend format to Retell API format
        const retellUpdates: any = {}
        if (updates.name !== undefined) retellUpdates.agent_name = updates.name
        if (updates.description !== undefined) retellUpdates.description = updates.description
        if (updates.prompt !== undefined) retellUpdates.prompt = updates.prompt  // Include prompt for LLM update
        if (updates.voice !== undefined) retellUpdates.voice_id = updates.voice
        if (updates.temperature !== undefined) retellUpdates.voice_temperature = updates.temperature
        if (updates.speed !== undefined) retellUpdates.voice_speed = updates.speed
        if (updates.volume !== undefined) retellUpdates.volume = updates.volume
        if (updates.responsiveness !== undefined) retellUpdates.responsiveness = updates.responsiveness
        if (updates.interruptionSensitivity !== undefined) retellUpdates.interruption_sensitivity = updates.interruptionSensitivity
        if (updates.backchannelEnabled !== undefined) retellUpdates.enable_backchannel = updates.backchannelEnabled
        if (updates.backchannelFrequency !== undefined) retellUpdates.backchannel_frequency = updates.backchannelFrequency
        if (updates.backchannelWords !== undefined) retellUpdates.backchannel_words = updates.backchannelWords
        if (updates.boostedKeywords !== undefined) retellUpdates.boosted_keywords = updates.boostedKeywords
        if (updates.pronunciation !== undefined) {
          retellUpdates.pronunciation_dictionary = updates.pronunciation.filter(p => p.word && p.pronunciation).map(p => ({
            word: p.word,
            alphabet: "ipa",
            phoneme: p.pronunciation
          }))
        }
        
        const backendAgent = await agentApi.update(id, retellUpdates)
        
        // Map response back to frontend format
        const updatedAgent = mapBackendAgentToFrontend(backendAgent)
        
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === id ? updatedAgent : agent
          ),
          isLoading: false
        }))
        
        // Invalidate cache and refresh from API to get latest data
        get().invalidateCache();
        await get().fetchAgents(true);
      } catch (error) {
        set({ error: 'Failed to update agent', isLoading: false })
        throw error
      }
    },

    deleteAgent: async (id) => {
      set({ isLoading: true, error: null })
      try {
        await agentApi.delete(id)
        set((state) => ({
          agents: state.agents.filter((agent) => agent.id !== id),
          selectedAgent: state.selectedAgent?.id === id ? null : state.selectedAgent,
          isLoading: false
        }))
        
        // Invalidate cache and refresh from API to get latest data
        get().invalidateCache();
        await get().fetchAgents(true);
      } catch (error) {
        set({ error: 'Failed to delete agent', isLoading: false })
      }
    },

    selectAgent: (agent) => set({ selectedAgent: agent }),

    duplicateAgent: async (id) => {
      const agent = get().getAgentById(id)
      if (agent) {
        const duplicatedAgent = {
          ...agent,
          name: `${agent.name} (Copy)`,
          status: 'draft' as const,
        }
        // Remove fields that should be auto-generated
        delete (duplicatedAgent as any).id
        delete (duplicatedAgent as any).createdAt
        delete (duplicatedAgent as any).updatedAt
        delete (duplicatedAgent as any).callsToday
        
        await get().addAgent(duplicatedAgent)
      }
    },

    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),

    ensureAgentsLoaded: async () => {
      const { lastFetched, isLoading } = get();
      
      // Only fetch if we don't have fresh data and not currently loading
      const isCacheValid = lastFetched && (Date.now() - lastFetched < CACHE_DURATION);
      if (!isCacheValid && !isLoading) {
        await get().fetchAgents();
      }
    },

    invalidateCache: () => {
      localStorage.removeItem(STORAGE_KEY);
      set({ lastFetched: null });
    },

    // Computed getters
    getAgentById: (id) => {
      return get().agents.find((agent) => agent.id === id)
    },

    getActiveAgents: () => {
      return get().agents.filter((agent) => agent.status === 'active')
    },

    getAgentStats: () => {
      const agents = get().agents
      return {
        total: agents.length,
        active: agents.filter(a => a.status === 'active').length,
        totalCallsToday: agents.reduce((sum, a) => {
          // Handle both camelCase and snake_case from API, with fallback to 0
          const callsToday = a.callsToday || (a as any).calls_today || 0;
          return sum + (typeof callsToday === 'number' ? callsToday : 0);
        }, 0),
      }
    },
  }))
)

// Selectors for optimized re-renders
export const agentSelectors = {
  agents: (state: AgentState) => state.agents,
  selectedAgent: (state: AgentState) => state.selectedAgent,
  isLoading: (state: AgentState) => state.isLoading,
  error: (state: AgentState) => state.error,
  // Note: Remove computed selectors to avoid infinite loops
  // Use the functions directly in components: useAgentStore((state) => state.getActiveAgents())
}
