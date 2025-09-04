import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCallStore, callSelectors } from "@/stores/callStore";
import { useAgentStore } from "@/stores/agentStore";
import { useShallow } from 'zustand/react/shallow';
import { 
  Search, 
  Play, 
  Download, 
  Eye, 
  Clock,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  RefreshCw
} from "lucide-react";

export default function CallResults() {
  // Use Zustand stores
  const filteredCalls = useCallStore(useShallow((state) => state.getFilteredCalls()));
  const callStats = useCallStore(useShallow((state) => state.getCallStats()));
  const searchTerm = useCallStore(callSelectors.searchTerm);
  const statusFilter = useCallStore(callSelectors.statusFilter);
  const isLoading = useCallStore((state) => state.isLoading);
  const error = useCallStore((state) => state.error);
  const { setSearchTerm, setStatusFilter, fetchCallDetails, ensureCallsLoaded, invalidateCache } = useCallStore();
  
  // Agent store for fetching agents
  const { fetchAgents } = useAgentStore();
  
  // Local state for call details loading
  const [loadingDetailCallId, setLoadingDetailCallId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Load data efficiently with caching
  useEffect(() => {
    const initializeData = async () => {
      // Use cached data when possible, only fetch if stale
      await Promise.all([ensureCallsLoaded(), fetchAgents()]);
    };
    
    initializeData();
  }, [ensureCallsLoaded, fetchAgents]);

  // Function to handle viewing call details
  const handleViewDetails = async (callId: string) => {
    setLoadingDetailCallId(callId);
    setDetailError(null);
    
    try {
      await fetchCallDetails(callId);
    } catch (error) {
      setDetailError(`Failed to load call details: ${error}`);
    } finally {
      setLoadingDetailCallId(null);
    }
  };

  // Function to refresh data from API
  const handleRefreshData = async () => {
    // Invalidate cache and force refresh
    invalidateCache();
    await Promise.all([ensureCallsLoaded(), fetchAgents()]);
  };



  // Show loading state
  if (isLoading && filteredCalls.length === 0) {
    return (
      <div className="w-full space-y-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Fetching latest calls from Retell AI...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full space-y-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">❌ {error}</p>
            <Button 
              onClick={() => useCallStore.getState().setError(null)}
              variant="default"
            >
              Clear Error
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Call Results
            <span className="text-sm font-normal text-green-600 ml-2">(LIVE API DATA)</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time view of call results from Retell AI. Click "View Details" to see full transcripts.
          </p>
        </div>
        <Button 
          onClick={handleRefreshData}
          variant="outline"
          disabled={isLoading}
          className="flex-shrink-0"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="w-full grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {callStats.completed} completed, {callStats.failed} failed, {callStats.inProgress} in progress
            </p>
          </CardContent>
        </Card>
        
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              Based on completion status and confidence scores
            </p>
          </CardContent>
        </Card>
        
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.avgDuration}</div>
            <p className="text-xs text-muted-foreground">
              Average duration of completed calls
            </p>
          </CardContent>
        </Card>
        
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.avgConfidence}%</div>
            <p className="text-xs text-muted-foreground">
              Quality score from AI analysis
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters and Search */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Call History</CardTitle>
          <CardDescription>
            Search and filter through your call results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by driver name or load number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background w-full sm:w-auto sm:min-w-[150px]"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="in-progress">In Progress</option>
            </select>
          </div>

          <div className="space-y-4">
            {filteredCalls.length === 0 && !isLoading ? (
              <div className="text-center py-12">
                <div className="text-center">
                  <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No calls found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No calls match your current filters. Try adjusting your search or status filter.'
                      : 'No calls have been made yet. Go to the Call Trigger page to initiate your first call with Retell AI.'
                    }
                  </p>
                  <div className="flex gap-3 justify-center">
                    {(searchTerm || statusFilter !== 'all') && (
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('all');
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                    <Button 
                      onClick={handleRefreshData}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              filteredCalls.map((call) => (
              <div key={call.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    {call.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {call.status === 'failed' && <XCircle className="h-5 w-5 text-red-600" />}
                    {call.status === 'in-progress' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{call.driver}</p>
                      <Badge variant="outline" className="text-xs">{call.loadNumber}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{call.scenario} • {call.phone}</p>
                    <p className="text-xs text-muted-foreground">{call.outcome}</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-medium">{call.duration}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(call.timestamp).toLocaleString()}
                    </p>
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(call.id)}
                        disabled={loadingDetailCallId === call.id}
                      >
                        {loadingDetailCallId === call.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            Loading...
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </>
                        )}
                      </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                      <DialogHeader className="flex-shrink-0">
                        <DialogTitle>Call Details - {call.driver}</DialogTitle>
                        <DialogDescription>
                          {call.loadNumber} • {call.scenario} • {new Date(call.timestamp).toLocaleString()}
                        </DialogDescription>
                      </DialogHeader>
                      
                      {/* Show error state if failed to load details */}
                      {detailError && (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <p className="text-red-600 mb-4">❌ {detailError}</p>
                            <Button 
                              onClick={() => {
                                setDetailError(null);
                                handleViewDetails(call.id);
                              }}
                              variant="outline"
                              size="sm"
                            >
                              Retry
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Show loading state while fetching details */}
                      {loadingDetailCallId === call.id && !detailError && (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading call details and transcript...</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Show call details when loaded */}
                      {!detailError && loadingDetailCallId !== call.id && (
                        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                        {/* Call Summary */}
                        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Call Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <span className="text-sm text-muted-foreground">Driver</span>
                                  <p className="font-medium">{call.driver}</p>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Phone</span>
                                  <p className="font-medium">{call.phone}</p>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Load Number</span>
                                  <p className="font-medium">{call.loadNumber}</p>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Agent</span>
                                  <p className="font-medium">{call.agent}</p>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Duration</span>
                                  <p className="font-medium">{call.duration}</p>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Status</span>
                                  <Badge 
                                    className="mt-1"
                                    variant={
                                      call.status === 'completed' ? 'default' : 
                                      call.status === 'failed' ? 'destructive' : 'secondary'
                                    }
                                  >
                                    {call.status}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Call Outcome</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="text-sm text-muted-foreground">Summary</span>
                                <p className="text-sm leading-relaxed mt-1">{call.outcome}</p>
                              </div>
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm text-muted-foreground">Confidence</span>
                                  <span className="text-sm font-medium">
                                    {Math.round(call.confidence * 100)}%
                                  </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full" 
                                    style={{ width: `${call.confidence * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-wrap gap-3">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 min-w-[140px]"
                            onClick={() => {
                              // In a real implementation, this would play the recording_url from the API
                              // You could open recording_url in a new tab or use an audio player
                            }}
                            disabled={!call.transcript || call.transcript.length === 0}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Play Recording
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 min-w-[140px]"
                            onClick={() => {
                              // In a real implementation, this would download the recording_url from the API
                            }}
                            disabled={!call.transcript || call.transcript.length === 0}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Audio
                          </Button>
                        </div>

                        {/* Conversation Transcript */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Conversation Transcript</CardTitle>
                            <CardDescription>
                              {call.transcript && call.transcript.length > 0 
                                ? `${call.transcript.length} conversation turns`
                                : 'No transcript available'
                              }
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {call.transcript && call.transcript.length > 0 ? (
                              <div className="space-y-3 max-h-80 overflow-y-auto">
                                {call.transcript.map((entry, index) => (
                                  <div key={index} className={`flex ${entry.speaker === 'Agent' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-lg ${
                                      entry.speaker === 'Agent' 
                                        ? 'bg-primary text-primary-foreground' 
                                        : entry.speaker === 'System'
                                        ? 'bg-muted text-muted-foreground text-center'
                                        : 'bg-muted'
                                    }`}>
                                      <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-medium">{entry.speaker}</p>
                                        <p className="text-xs opacity-70">{entry.timestamp}</p>
                                      </div>
                                      <p className="text-sm">{entry.text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                                <p>No transcript available for this call</p>
                                {call.status === 'pending' && (
                                  <p className="text-xs mt-1">Transcript will be available after the call completes</p>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        
                        {/* Extracted Data */}
                        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                Location Data
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="text-sm text-muted-foreground">Current Location</span>
                                <p className="font-medium mt-1">
                                  {call.extractedData?.currentLocation || (call as any).extracted_data?.current_location || 'Unknown'}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">Estimated Arrival</span>
                                <p className="font-medium mt-1">
                                  {call.extractedData?.estimatedArrival || (call as any).extracted_data?.estimated_arrival || 'Unknown'}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Status & Issues
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="text-sm text-muted-foreground">Driver Status</span>
                                <p className="font-medium mt-1">
                                  {call.extractedData?.driverStatus || (call as any).extracted_data?.driver_status || 'Unknown'}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">Issues</span>
                                <p className="font-medium mt-1">
                                  {call.extractedData?.issues || (call as any).extracted_data?.issues || 'None reported'}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
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
