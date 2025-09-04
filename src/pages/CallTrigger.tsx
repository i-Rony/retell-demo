import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAgentStore } from "@/stores/agentStore";
import { useCallStore, type CallTranscriptEntry } from "@/stores/callStore";
import { useShallow } from 'zustand/react/shallow';
import { toast } from "sonner";
import { Phone, User, Truck, MapPin, Clock, CheckCircle, Globe } from "lucide-react";
import SimpleWebCall from "@/components/SimpleWebCall";

export default function CallTrigger() {
  const activeAgents = useAgentStore(useShallow((state) => state.getActiveAgents()));
  const { fetchAgents } = useAgentStore();
  const { addCall, updateCall, ensureCallsLoaded } = useCallStore();
  const recentCalls = useCallStore(useShallow((state) => 
    state.calls
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3)
  ));

  // Ensure agents and calls are loaded for the dropdown and recent calls display
  useEffect(() => {
    Promise.all([fetchAgents(), ensureCallsLoaded()]);
  }, [fetchAgents, ensureCallsLoaded]); // Proper dependencies
  
  const [formData, setFormData] = useState({
    driverName: "",
    phoneNumber: "",
    loadNumber: "",
    pickupLocation: "",
    deliveryLocation: "",
    estimatedPickupTime: "",
    selectedAgent: activeAgents[0]?.id || "",
    scenario: "driver-checkin",
    notes: ""
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [currentCallStoreId, setCurrentCallStoreId] = useState<string | null>(null);
  const [webCallData, setWebCallData] = useState<{
    callId: string;
    accessToken: string;
    driverName: string;
    loadNumber: string;
  } | null>(null);



  const scenarios = [
    { id: "driver-checkin", name: "Driver Check-in", description: "Standard driver check-in for pickup/delivery" },
    { id: "emergency-protocol", name: "Emergency Protocol", description: "Emergency situation requiring immediate response" },
    { id: "delivery-confirmation", name: "Delivery Confirmation", description: "Confirm delivery completion and get details" },
    { id: "pickup-reminder", name: "Pickup Reminder", description: "Remind driver about upcoming pickup" }
  ];

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({...formData, phoneNumber: formatted});
  };

  const isFormValid = () => {
    return formData.driverName && formData.phoneNumber && formData.loadNumber && formData.selectedAgent;
  };

  const isWebCallFormValid = () => {
    return formData.driverName && formData.loadNumber && formData.selectedAgent;
  };

  // Helper function to add call to store
  const addCallToStore = (callType: 'phone' | 'web') => {
    const selectedAgent = activeAgents.find(a => a.id === formData.selectedAgent);
    
    const callData = {
      driver: formData.driverName,
      phone: callType === 'phone' ? formData.phoneNumber : 'Web Call (No Phone)',
      loadNumber: formData.loadNumber,
      agent: selectedAgent?.name || 'Unknown Agent',
      agentId: formData.selectedAgent,
      scenario: formData.scenario,
      status: 'pending' as const,
      duration: '0:00',
      outcome: callType === 'phone' ? 'Phone call initiated...' : 'Web call session created...',
      confidence: 0,
      extractedData: {},
      transcript: [],
      pickupLocation: formData.pickupLocation,
      deliveryLocation: formData.deliveryLocation,
      estimatedPickupTime: formData.estimatedPickupTime,
      notes: formData.notes + (callType === 'web' ? ' [Web Call]' : ' [Phone Call]'),
    };

    const newCall = addCall(callData);
    return newCall;
  };

  const handlePhoneCall = async () => {
    setIsCallInProgress(true);
    
    toast("Phone Call Initiated", {
      description: `Calling ${formData.driverName} at ${formData.phoneNumber} from +15103183385...`
    });
    
    let callStoreId: string | null = null;
    
    try {
      
      // Add call to store first
      const newCall = addCallToStore('phone');
      callStoreId = newCall.id;
      setCurrentCallStoreId(callStoreId);
      
      // Import and use the phone call API
      const { callApi } = await import('@/services/api');
      const result = await callApi.triggerPhoneCall({
        driverName: formData.driverName,
        phoneNumber: formData.phoneNumber,
        loadNumber: formData.loadNumber,
        agentId: formData.selectedAgent
      });
      
      // Update call store with actual call ID and status
      if (callStoreId) {
        updateCall(callStoreId, {
          id: result.call_id || callStoreId,
          status: 'in-progress',
          outcome: `Phone call initiated successfully. Call ID: ${result.call_id}`
        });
      }
      
      toast.success("Phone Call Initiated Successfully", {
        description: `Call ID: ${result.call_id}. Check your FastAPI terminal for webhook events!`
      });
      
      // Reset form
      setFormData({
        driverName: "",
        phoneNumber: "",
        loadNumber: "",
        pickupLocation: "",
        deliveryLocation: "",
        estimatedPickupTime: "",
        selectedAgent: activeAgents[0]?.id || "",
        scenario: "driver-checkin",
        notes: ""
      });
      
    } catch (error) {
      // Update call store with failure
      if (callStoreId) {
        updateCall(callStoreId, {
          status: 'failed',
          outcome: `Phone call failed: ${error}`
        });
      }
      
      toast.error("Phone Call Failed", {
        description: "Failed to initiate phone call. Check console for details."
      });
    } finally {
      setIsCallInProgress(false);
      setIsPreviewOpen(false);
      setCurrentCallStoreId(null);
    }
  };

  const handleWebCall = async () => {
    setIsCallInProgress(true);
    
    toast("Web Call Initiated", {
      description: `Creating web call session for ${formData.driverName}...`
    });
    
    let callStoreId: string | null = null;
    
    try {
      
      // Add call to store first
      const newCall = addCallToStore('web');
      callStoreId = newCall.id;
      setCurrentCallStoreId(callStoreId);
      
      // Import and use the web call API
      const { callApi } = await import('@/services/api');
      const result = await callApi.createWebCall({
        driverName: formData.driverName,
        phoneNumber: formData.phoneNumber,
        loadNumber: formData.loadNumber,
        agentId: formData.selectedAgent
      });
      
      
      // Update call store with actual call ID and status
      if (callStoreId) {
        updateCall(callStoreId, {
          id: result.call_id || callStoreId,
          status: 'in-progress',
          outcome: `Web call session created. Call ID: ${result.call_id}. Access token: ${result.access_token?.substring(0, 20)}...`
        });
      }
      
      // Set web call data to show the calling interface
      const webCallInfo = {
        callId: result.call_id,
        accessToken: result.access_token,
        driverName: formData.driverName,
        loadNumber: formData.loadNumber
      };
      
      setWebCallData(webCallInfo);
      
      toast.success("🌐 Web call session created! Starting connection...");
      
      // Close the modal
      setIsPreviewOpen(false);
      
      // Don't reset form here - only reset when call actually ends in handleWebCallEnd
      
    } catch (error) {
      
      // Update call store with failure
      if (callStoreId) {
        updateCall(callStoreId, {
          status: 'failed',
          outcome: `Web call failed: ${error}`
        });
      }
      
      toast.error("Web Call Failed", {
        description: "Failed to create web call. Check console for details."
      });
    } finally {
      setIsCallInProgress(false);
      setIsPreviewOpen(false);
      setCurrentCallStoreId(null);
    }
  };

  const handleWebCallEnd = (callData?: { transcript: any[], duration: number }) => {
    
    // Save transcript and call completion data to store if available
    if (currentCallStoreId && callData) {
      
      // Convert transcript format from SimpleWebCall to store format
      const storeTranscript: CallTranscriptEntry[] = callData.transcript.map(entry => ({
        speaker: entry.role === 'agent' ? 'Agent' : 'Driver',
        text: entry.content,
        timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : new Date().toISOString()
      }));
      
      const formattedDuration = `${Math.floor(callData.duration / 60)}:${(callData.duration % 60).toString().padStart(2, '0')}`;
      
      updateCall(currentCallStoreId, {
        status: 'completed',
        duration: formattedDuration,
        outcome: `Web call completed successfully with ${callData.transcript.length} conversation exchanges`,
        transcript: storeTranscript,
        confidence: 0.9 // Default confidence for completed calls
      });
      
      toast.success(`📋 Call data saved! Transcript: ${callData.transcript.length} messages, Duration: ${formattedDuration}`);
    }
    
    // Reset UI state
    setWebCallData(null);
    setCurrentCallStoreId(null);
    
    // Reset form after call ends
    setFormData({
      driverName: "",
      phoneNumber: "",
      loadNumber: "",
      pickupLocation: "",
      deliveryLocation: "",
      estimatedPickupTime: "",
      selectedAgent: activeAgents[0]?.id || "",
      scenario: "driver-checkin",
      notes: ""
    });
  };

  // Debug: Log webCallData changes
  useEffect(() => {
    // Monitor webCallData changes
  }, [webCallData]);

  return (
    <div className="w-full space-y-8">


      {/* Web Call Interface - Show when web call is active */}

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Trigger Test Call
          <span className="text-sm font-normal text-green-600 ml-2">(LIVE API)</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Initiate a test call to a driver using your configured AI agents via Retell AI.
        </p>
      </div>
      
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {/* Driver Information */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Driver Information
            </CardTitle>
            <CardDescription>
              Enter the driver details for the test call
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="driver-name">Driver Name *</Label>
              <Input 
                id="driver-name" 
                value={formData.driverName}
                onChange={(e) => setFormData({...formData, driverName: e.target.value})}
                placeholder="John Doe" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone-number">Phone Number *</Label>
              <Input 
                id="phone-number" 
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
                placeholder="+1 (555) 123-4567" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="load-number">Load Number *</Label>
              <Input 
                id="load-number" 
                value={formData.loadNumber}
                onChange={(e) => setFormData({...formData, loadNumber: e.target.value})}
                placeholder="LD-2024-001" 
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Load Details */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Load Details
            </CardTitle>
            <CardDescription>
              Pickup and delivery information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickup-location">Pickup Location</Label>
              <Input 
                id="pickup-location" 
                value={formData.pickupLocation}
                onChange={(e) => setFormData({...formData, pickupLocation: e.target.value})}
                placeholder="123 Main St, City, State" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="delivery-location">Delivery Location</Label>
              <Input 
                id="delivery-location" 
                value={formData.deliveryLocation}
                onChange={(e) => setFormData({...formData, deliveryLocation: e.target.value})}
                placeholder="456 Oak Ave, City, State" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pickup-time">Estimated Pickup Time</Label>
              <Input 
                id="pickup-time" 
                type="datetime-local"
                value={formData.estimatedPickupTime}
                onChange={(e) => setFormData({...formData, estimatedPickupTime: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Call Configuration */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="h-5 w-5 mr-2" />
              Call Configuration
            </CardTitle>
            <CardDescription>
              Select the agent and scenario for this test call
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-select">Select Agent *</Label>
              <select 
                id="agent-select"
                value={formData.selectedAgent}
                onChange={(e) => setFormData({...formData, selectedAgent: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                {activeAgents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="scenario">Scenario Type *</Label>
              <select 
                id="scenario"
                value={formData.scenario}
                onChange={(e) => setFormData({...formData, scenario: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                {scenarios.map(scenario => (
                  <option key={scenario.id} value={scenario.id}>{scenario.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {scenarios.find(s => s.id === formData.scenario)?.description}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea 
                id="notes" 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Any special instructions or context..."
                rows={3}
              />
            </div>

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full mt-6" 
                  size="lg"
                  disabled={!isFormValid()}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Preview & Initiate Call
                </Button>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Review & Start Call</DialogTitle>
                  <DialogDescription>
                    Review the details and choose your call method
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formData.driverName}</span>
                      <Badge variant="outline">{formData.phoneNumber}</Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Load {formData.loadNumber}</span>
                    </div>
                    
                    {formData.pickupLocation && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formData.pickupLocation}</span>
                      </div>
                    )}
                    
                    {formData.estimatedPickupTime && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(formData.estimatedPickupTime).toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">Agent:</p>
                      <p className="font-medium">
                        {activeAgents.find(a => a.id === formData.selectedAgent)?.name}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Scenario:</p>
                      <p className="font-medium">
                        {scenarios.find(s => s.id === formData.scenario)?.name}
                      </p>
                    </div>
                    
                    {formData.notes && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">Notes:</p>
                        <p className="text-sm">{formData.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="pt-6 border-t">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold">Choose Call Type</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select how you want to initiate the call
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Phone Call Option */}
                    <Button 
                      onClick={handlePhoneCall}
                      disabled={isCallInProgress || !isFormValid()}
                      className="w-full h-16 justify-start text-left p-4"
                      variant="default"
                    >
                      {isCallInProgress ? (
                        <div className="flex items-center justify-center w-full">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          <span>Initiating phone call...</span>
                        </div>
                      ) : (
                        <div className="flex items-center w-full">
                          <Phone className="h-6 w-6 mr-4 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-semibold">Phone Call</div>
                            <div className="text-sm opacity-90">
                              Call {formData.phoneNumber} from +15103183385
                            </div>
                          </div>
                        </div>
                      )}
                    </Button>

                    {/* Web Call Option */}
                    <Button 
                      onClick={handleWebCall}
                      disabled={isCallInProgress || !isWebCallFormValid()}
                      className="w-full h-16 justify-start text-left p-4"
                      variant="secondary"
                    >
                      {isCallInProgress ? (
                        <div className="flex items-center justify-center w-full">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-3"></div>
                          <span>Creating web call...</span>
                        </div>
                      ) : (
                        <div className="flex items-center w-full">
                          <Globe className="h-6 w-6 mr-4 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-semibold">Web Call (Browser)</div>
                            <div className="text-sm opacity-90">
                              Create browser-based call session
                            </div>
                          </div>
                        </div>
                      )}
                    </Button>
                  </div>
                  
                  <div className="text-center mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsPreviewOpen(false)}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {webCallData && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-green-600">🌐 Web Call Active</h2>
          <SimpleWebCall
            callId={webCallData.callId}
            accessToken={webCallData.accessToken}
            driverName={webCallData.driverName}
            loadNumber={webCallData.loadNumber}
            onCallEnd={handleWebCallEnd}
          />
        </div>
      )}

      {/* Recent Calls */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Recent Test Calls</CardTitle>
          <CardDescription>
            Your latest test calls and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentCalls.length === 0 ? (
              <div className="text-center py-8">
                <Phone className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No recent calls found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Initiate your first test call to see results here
                </p>
              </div>
            ) : (
              recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{call.driver}</p>
                      <p className="text-sm text-muted-foreground">Load {call.loadNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant={
                        call.status === 'completed' ? 'default' : 
                        call.status === 'failed' ? 'destructive' : 'secondary'
                      }
                    >
                      {call.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {call.status}
                    </Badge>
                    <div className="text-right">
                      <p className="text-sm font-medium">{call.duration}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(call.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
