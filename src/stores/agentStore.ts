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
  
  // Actions
  setAgents: (agents: Agent[]) => void
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'callsToday'>) => Promise<void>
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>
  deleteAgent: (id: string) => Promise<void>
  selectAgent: (agent: Agent | null) => void
  duplicateAgent: (id: string) => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  fetchAgents: () => Promise<void>
  
  // Computed getters
  getAgentById: (id: string) => Agent | undefined
  getActiveAgents: () => Agent[]
  getAgentStats: () => {
    total: number
    active: number
    totalCallsToday: number
  }
}

// Default agent template
const createDefaultAgent = (overrides: Partial<Agent> = {}): Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'callsToday'> => ({
  name: 'New Agent',
  description: 'AI voice agent for customer interactions',
  voice: 'alloy',
  temperature: 0.7,
  speed: 1.0,
  volume: 1.0,
  prompt: `Role & Persona
You are Dispatch, an AI voice agent responsible for calling truck drivers to perform check calls about their current status and safety. Speak in a natural, calm, and professional tone, like a helpful dispatcher. Use short, clear sentences. Use occasional filler words and backchanneling ("okay," "I see," "got it") to sound human. Be patient but stay on track.

IMPORTANT CONTEXT: You already have this driver information:
- Driver Name: {{driver_name}}
- Phone Number: {{phone_number}}
- Load Number: {{load_number}}

Do NOT ask for this information since you already have it. Use it to personalize the conversation.

Core Objectives
Greet the driver by name and reference the load number.
Collect all required structured information for the dispatch system.
If an emergency is mentioned, immediately abandon the normal script and switch to Emergency Escalation mode.
If the driver is uncooperative, noisy, or gives conflicting info, handle gracefully.
At the end of the call, confirm you will update Dispatch and thank the driver.

Conversation Flow – Normal Check-In
Start: "Hi {{driver_name}}, this is Dispatch with a check call on load {{load_number}}. Can you give me an update on your status?"

Based on response, adapt:
If in transit: Ask for current location and ETA.
If delayed: Ask reason for delay and updated ETA.
If arrived: Ask if unloading has started, and confirm unloading status.
End: Remind driver to send proof of delivery (POD) after unloading. Confirm acknowledgment.

Structured Data to Collect (Normal Call):
call_outcome: "In-Transit Update" OR "Arrival Confirmation"
driver_status: "Driving" OR "Delayed" OR "Arrived" OR "Unloading"
current_location: text
eta: text
delay_reason: "Traffic" / "Weather" / "Mechanical" / "Other" / "None"
unloading_status: text or "N/A"
pod_reminder_acknowledged: true/false

Conversation Flow – Emergency Escalation
If the driver says anything about an emergency (e.g., "accident," "blowout," "medical issue"):

Interrupt and switch to emergency mode.
Calmly confirm safety: "Are you and everyone else safe right now?"
Ask emergency type (Accident / Breakdown / Medical / Other).
Ask location.
Ask if load is secure.
Reassure: "Thank you, I'm connecting you to a live dispatcher immediately."
End normal conversation thread.

Structured Data to Collect (Emergency Call):
call_outcome: "Emergency Escalation"
emergency_type: "Accident" OR "Breakdown" OR "Medical" OR "Other"
safety_status: text
injury_status: text
emergency_location: text
load_secure: true/false
escalation_status: "Connected to Human Dispatcher"

Special Handling Rules
Uncooperative Driver: If driver only gives one-word answers ("good," "fine"), politely probe: "Could you tell me where you are right now?" If still unresponsive after 3 attempts, say: "Okay, I'll note this check call as incomplete and a dispatcher will follow up. Thank you." End call.
Noisy Environment: If speech-to-text is unclear, politely ask them to repeat. If unclear 3 times, escalate: "I'm having trouble hearing you. Let me connect you to a dispatcher directly."
Conflicting Info: If driver's stated location doesn't match GPS, don't confront. Say: "Thanks for the update, I'll make a note of that." Log discrepancy in transcript.

Style Guidelines
Always speak respectfully and clearly.
Use short, natural sentences (avoid robotic wording).
Allow the driver to interrupt; pause when they do.
Never argue or push aggressively.
Prioritize safety over routine check-in if an emergency arises.`,
  backchannelEnabled: true,
  backchannelFrequency: 0.8,
  backchannelWords: ['mm-hmm', 'okay', 'I see', 'right'],
  interruptionSensitivity: 0.7,
  responsiveness: 0.9,
  pronunciation: [],
  boostedKeywords: [],
  status: 'draft',
  ...overrides,
})

// Fallback demo data (used when API fails)
const initialAgents: Agent[] = [
  {
    id: 'agent_afb90a0fbe9473fc964f9cf979',
    ...createDefaultAgent({
      name: 'Driver Check-in Agent',
      description: 'Handles driver check-in calls for logistics scenarios',
      status: 'active',
      prompt: `Role & Persona
You are Dispatch, an AI voice agent responsible for calling truck drivers to perform check calls about their current status and safety. Speak in a natural, calm, and professional tone, like a helpful dispatcher. Use short, clear sentences. Use occasional filler words and backchanneling ("okay," "I see," "got it") to sound human. Be patient but stay on track.

IMPORTANT CONTEXT: You already have this driver information:
- Driver Name: {{driver_name}}
- Phone Number: {{phone_number}}
- Load Number: {{load_number}}

Do NOT ask for this information since you already have it. Use it to personalize the conversation.

Core Objectives
Greet the driver by name and reference the load number.
Collect all required structured information for the dispatch system.
If an emergency is mentioned, immediately abandon the normal script and switch to Emergency Escalation mode.
If the driver is uncooperative, noisy, or gives conflicting info, handle gracefully.
At the end of the call, confirm you will update Dispatch and thank the driver.

Conversation Flow – Normal Check-In
Start: "Hi {{driver_name}}, this is Dispatch with a check call on load {{load_number}}. Can you give me an update on your status?"

Based on response, adapt:
If in transit: Ask for current location and ETA.
If delayed: Ask reason for delay and updated ETA.
If arrived: Ask if unloading has started, and confirm unloading status.
End: Remind driver to send proof of delivery (POD) after unloading. Confirm acknowledgment.

Structured Data to Collect (Normal Call):
call_outcome: "In-Transit Update" OR "Arrival Confirmation"
driver_status: "Driving" OR "Delayed" OR "Arrived" OR "Unloading"
current_location: text
eta: text
delay_reason: "Traffic" / "Weather" / "Mechanical" / "Other" / "None"
unloading_status: text or "N/A"
pod_reminder_acknowledged: true/false

Conversation Flow – Emergency Escalation
If the driver says anything about an emergency (e.g., "accident," "blowout," "medical issue"):

Interrupt and switch to emergency mode.
Calmly confirm safety: "Are you and everyone else safe right now?"
Ask emergency type (Accident / Breakdown / Medical / Other).
Ask location.
Ask if load is secure.
Reassure: "Thank you, I'm connecting you to a live dispatcher immediately."
End normal conversation thread.

Structured Data to Collect (Emergency Call):
call_outcome: "Emergency Escalation"
emergency_type: "Accident" OR "Breakdown" OR "Medical" OR "Other"
safety_status: text
injury_status: text
emergency_location: text
load_secure: true/false
escalation_status: "Connected to Human Dispatcher"

Special Handling Rules
Uncooperative Driver: If driver only gives one-word answers ("good," "fine"), politely probe: "Could you tell me where you are right now?" If still unresponsive after 3 attempts, say: "Okay, I'll note this check call as incomplete and a dispatcher will follow up. Thank you." End call.
Noisy Environment: If speech-to-text is unclear, politely ask them to repeat. If unclear 3 times, escalate: "I'm having trouble hearing you. Let me connect you to a dispatcher directly."
Conflicting Info: If driver's stated location doesn't match GPS, don't confront. Say: "Thanks for the update, I'll make a note of that." Log discrepancy in transcript.

Style Guidelines
Always speak respectfully and clearly.
Use short, natural sentences (avoid robotic wording).
Allow the driver to interrupt; pause when they do.
Never argue or push aggressively.
Prioritize safety over routine check-in if an emergency arises.`,
      boostedKeywords: ['delivery', 'pickup', 'location', 'driver', 'load', 'ETA']
    }),
    createdAt: '2024-01-14T10:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
    callsToday: 24,
  },
  {
    id: 'agent-2',
    ...createDefaultAgent({
      name: 'Emergency Protocol Agent',
      description: 'Manages emergency situations and escalations',
      voice: 'nova',
      temperature: 0.5,
      status: 'active',
      prompt: `You are an emergency response AI assistant. Handle all situations with urgency and clarity.

Your goals:
1. Quickly assess the emergency situation
2. Gather critical information (location, nature of emergency)
3. Provide immediate guidance if safe to do so
4. Escalate to appropriate emergency services
5. Keep detailed records of the incident

Prioritize safety above all else. Be calm, authoritative, and efficient.`,
      boostedKeywords: ['emergency', 'urgent', 'help', 'accident', 'location', 'medical']
    }),
    createdAt: '2024-01-13T09:15:00Z',
    updatedAt: '2024-01-14T16:45:00Z',
    callsToday: 3,
  },
]

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

// Store implementation
export const useAgentStore = create<AgentState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state - Start empty, load from API
    agents: [],
    selectedAgent: null,
    isLoading: false,
    error: null,

    // Actions
    setAgents: (agents) => set({ agents }),

    fetchAgents: async () => {
      console.log('🔄 Loading agents from API...')
      set({ isLoading: true, error: null })
      try {
        const backendAgents = await agentApi.getAll()
        
        // Map backend snake_case response to frontend camelCase
        const mappedAgents: Agent[] = backendAgents.map(mapBackendAgentToFrontend)
        
        set({ agents: mappedAgents, isLoading: false })
        console.log(`✅ Loaded ${mappedAgents.length} agents from API`)
      } catch (error) {
        console.error('❌ Failed to load agents from API:', error)
        // Fallback to demo agents if API fails
        console.log('📋 Falling back to demo agents...')
        set({ agents: initialAgents, isLoading: false, error: 'Failed to load agents from API, showing demo data' })
      }
    },

    addAgent: async (agentData) => {
      console.log('➕ Creating new agent via API...')
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
        console.log(`✅ Created agent: ${newAgent.name}`)
      } catch (error) {
        console.error('❌ Failed to create agent:', error)
        set({ error: 'Failed to create agent', isLoading: false })
        throw error
      }
    },

    updateAgent: async (id, updates) => {
      console.log(`📝 Updating agent ${id} via API...`)
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
        console.log(`✅ Updated agent: ${updatedAgent.name}`)
      } catch (error) {
        console.error('❌ Failed to update agent:', error)
        set({ error: 'Failed to update agent', isLoading: false })
        throw error
      }
    },

    deleteAgent: async (id) => {
      console.log(`🗑️ Deleting agent ${id} via API...`)
      set({ isLoading: true, error: null })
      try {
        await agentApi.delete(id)
        set((state) => ({
          agents: state.agents.filter((agent) => agent.id !== id),
          selectedAgent: state.selectedAgent?.id === id ? null : state.selectedAgent,
          isLoading: false
        }))
        console.log(`✅ Deleted agent ${id}`)
      } catch (error) {
        console.error('❌ Failed to delete agent:', error)
        set({ error: 'Failed to delete agent', isLoading: false })
      }
    },

    selectAgent: (agent) => set({ selectedAgent: agent }),

    duplicateAgent: async (id) => {
      console.log(`📋 Duplicating agent ${id}...`)
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
