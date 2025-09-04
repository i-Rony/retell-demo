// API Service for connecting to FastAPI backend
// TODO: Replace demo endpoints with real Retell integration when ready

const API_BASE_URL = 'https://563b616714b0.ngrok-free.app/api/v1';

// Generic API request handler
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',  // Skip ngrok browser warning
  };

  const config: RequestInit = {
    headers: defaultHeaders,
    ...options,
  };

  console.log(`🔗 API Request: ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ API Response:`, data);
    return data;
  } catch (error) {
    console.error(`❌ API Error:`, error);
    throw error;
  }
}

// Agent API endpoints
export const agentApi = {
  // Get all agents
  getAll: (): Promise<any[]> => 
    apiRequest('/agents/'),

  // Get agent by ID
  getById: (id: string): Promise<any> => 
    apiRequest(`/agents/${id}/`),

  // Create new agent
  create: (agentData: any): Promise<any> => 
    apiRequest('/agents/', {
      method: 'POST',
      body: JSON.stringify(agentData),
    }),

  // Update agent
  update: (id: string, agentData: any): Promise<any> => 
    apiRequest(`/agents/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(agentData),
    }),

  // Delete agent
  delete: (id: string): Promise<any> => 
    apiRequest(`/agents/${id}/`, {
      method: 'DELETE',
    }),

  // Get agent versions
  getVersions: (id: string): Promise<any[]> => 
    apiRequest(`/agents/${id}/versions/`),
};

// Call API endpoints  
export const callApi = {
  // Get all calls - simplified to match Retell AI documentation
  getAll: (): Promise<any[]> => {
    return apiRequest('/calls/');
  },

  // Get call by ID
  getById: (id: string): Promise<any> => 
    apiRequest(`/calls/${id}`),

  // Create/initiate new call
  create: (callData: any): Promise<any> => {
    // Convert frontend camelCase to backend snake_case
    const backendCallData = {
      driver_name: callData.driver,
      phone_number: callData.phone,
      load_number: callData.loadNumber,
      agent_id: callData.agentId,
      scenario: callData.scenario,
      pickup_location: callData.pickupLocation,
      delivery_location: callData.deliveryLocation,
      estimated_pickup_time: callData.estimatedPickupTime,
      notes: callData.notes,
    };
    
    return apiRequest('/calls/', {
      method: 'POST',
      body: JSON.stringify(backendCallData),
    });
  },

  // Get call statistics
  getStats: (): Promise<any> => 
    apiRequest('/calls/stats/summary/'),

  // Trigger phone call (calls actual phone number)
  triggerPhoneCall: (data: { driverName: string; phoneNumber: string; loadNumber: string; agentId?: string }): Promise<any> => {
    const params = new URLSearchParams({
      driver_name: data.driverName,
      phone_number: data.phoneNumber,
      load_number: data.loadNumber,
      agent_id: data.agentId || "agent_afb90a0fbe9473fc964f9cf979"
    });
    
    console.log('📞 Triggering PHONE CALL to:', data.phoneNumber);
    return apiRequest(`/calls/start-test-call?${params.toString()}`, {
      method: 'POST',
    });
  },

  // Create web call (browser-based call)
  createWebCall: (data: { driverName?: string; phoneNumber?: string; loadNumber?: string; agentId?: string }): Promise<any> => {
    const params = new URLSearchParams({
      agent_id: data.agentId || "agent_afb90a0fbe9473fc964f9cf979"
    });
    
    if (data.driverName) params.append('driver_name', data.driverName);
    if (data.phoneNumber) params.append('phone_number', data.phoneNumber);
    if (data.loadNumber) params.append('load_number', data.loadNumber);
    
    console.log('🌐 Creating WEB CALL for agent:', data.agentId);
    return apiRequest(`/calls/web-call?${params.toString()}`, {
      method: 'POST',
    });
  },
};

// Voice API endpoints
export const voiceApi = {
  // Get all voices
  getAll: (): Promise<any[]> => 
    apiRequest('/voices/'),

  // Get voice by ID
  getById: (id: string): Promise<any> => 
    apiRequest(`/voices/${id}/`),
};

// Test API connection
export const testConnection = async (): Promise<boolean> => {
  try {
    await apiRequest('/');
    console.log('🎉 API connection successful!');
    return true;
  } catch (error) {
    console.error('🚫 API connection failed:', error);
    return false;
  }
};
