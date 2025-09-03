import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneOff, Mic, MicOff, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SimpleWebCallProps {
  callId: string;
  accessToken: string;
  onCallEnd?: (data: { transcript: TranscriptEntry[], duration: number }) => void;
  driverName?: string;
  loadNumber?: string;
}

interface TranscriptEntry {
  role: 'agent' | 'user';
  content: string;
  timestamp: Date;
}

export default function SimpleWebCall({ 
  callId, 
  accessToken, 
  onCallEnd,
  driverName,
  loadNumber 
}: SimpleWebCallProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<'pending' | 'granted' | 'denied'>('pending');

  // Debug logging
  console.log('🔍 SimpleWebCall rendered with:', { callId, accessToken: accessToken?.substring(0, 20) + '...', driverName, loadNumber });

  const retellClientRef = useRef<any>(null);
  const startTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializationRef = useRef<string | null>(null); // Track current call initialization

  useEffect(() => {
    console.log('🚀 Starting web call integration...');
    console.log('📞 Call ID:', callId);
    console.log('🔑 Access Token:', accessToken.substring(0, 20) + '...');
    
    // Prevent duplicate initialization for the same call
    if (initializationRef.current === callId) {
      console.log('⚠️ Call already initializing, skipping duplicate...');
      return;
    }
    
    // Mark this call as being initialized
    initializationRef.current = callId;
    
    // First, request microphone permission
    requestMicrophonePermission();
  }, [callId, accessToken]);

  const requestMicrophonePermission = async () => {
    try {
      console.log('🎤 Requesting microphone permission...');
      setIsConnecting(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
      setMicPermission('granted');
      
      // Stop the stream - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      toast.success('🎤 Microphone access granted! Connecting to agent...');
      
      // Now start the actual call
      await initializeWebCall();
      
    } catch (error: any) {
      console.error('❌ Microphone permission denied:', error);
      setMicPermission('denied');
      setIsConnecting(false);
      setError('Microphone permission is required for web calls');
      // Reset initialization tracking on error
      initializationRef.current = null;
      toast.error('🎤 Microphone permission required', {
        description: 'Please allow microphone access to start the call',
        duration: 5000
      });
    }
  };
    
  const initializeWebCall = async () => {
      try {
        setIsConnecting(true);
        setError(null);

        // Try to import Retell Web SDK
        console.log('📦 Importing retell-client-js-sdk...');
        const RetellWebClientModule = await import('retell-client-js-sdk');
        console.log('📦 Module imported:', RetellWebClientModule);
        
        const RetellWebClient = RetellWebClientModule.RetellWebClient || 
                                RetellWebClientModule.default ||
                                RetellWebClientModule;
        
        // Initialize the client
        retellClientRef.current = new RetellWebClient();
        
        // Set up event listeners
        retellClientRef.current.on('call_started', () => {
          console.log('📞 Web call connected! User can now speak.');
          setIsConnected(true);
          setIsConnecting(false);
          startTimeRef.current = new Date();
          
          // Start duration timer
          durationIntervalRef.current = setInterval(() => {
            if (startTimeRef.current) {
              const duration = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
              setCallDuration(duration);
            }
          }, 1000);
          
          // Add initial agent greeting to transcript
          setTranscript([{
            role: 'agent',
            content: `Hello ${driverName || 'Driver'}! I'm your AI assistant. I can see this is about load ${loadNumber || 'N/A'}. How can I help you today?`,
            timestamp: new Date()
          }]);
          
          console.log('✅ Added initial greeting to transcript');
          
          toast.success('🎙️ Connected! You can now speak to the agent', { duration: 3000 });
        });

        retellClientRef.current.on('call_ended', () => {
          console.log('📞 Web call ended');
          setIsConnected(false);
          setIsConnecting(false);
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
          }
          // Reset initialization tracking to allow future calls
          initializationRef.current = null;
          toast.info('Call ended');
          
          // Pass transcript and duration data back to parent
          console.log('📤 SIMPLEWEBCALL: Auto call ended - passing call data to parent:', {
            transcriptLength: transcript.length,
            duration: callDuration,
            transcript: transcript.slice(0, 2) // Show first 2 entries for debug
          });
          
          onCallEnd?.({
            transcript,
            duration: callDuration
          });
        });

        retellClientRef.current.on('error', (error: any) => {
          console.error('❌ Web call error:', error);
          setError(`Call error: ${error.message || 'Connection failed'}`);
          setIsConnected(false);
          setIsConnecting(false);
          // Reset initialization tracking to allow retry
          initializationRef.current = null;
          toast.error('Call connection failed');
        });

        retellClientRef.current.on('update', (update: any) => {
          console.log('📝 Transcript update received:', JSON.stringify(update, null, 2));
          
          // According to Retell docs, transcript is an array of utterance objects
          if (update.transcript && Array.isArray(update.transcript)) {
            console.log('📋 Processing transcript array with', update.transcript.length, 'entries');
            
            // Process each transcript entry
            const newEntries: TranscriptEntry[] = update.transcript.map((entry: any) => ({
              role: entry.role === 'agent' ? 'agent' : 'user',
              content: entry.content || '',
              timestamp: new Date()
            })).filter((entry: TranscriptEntry) => entry.content.trim());
            
            if (newEntries.length > 0) {
              console.log('📝 Adding', newEntries.length, 'new transcript entries');
              
              setTranscript(() => {
                // Replace with new complete transcript to avoid duplicates
                // Retell sends the complete transcript each time, not just new parts
                return newEntries;
              });
            }
          } else {
            console.log('⚠️ No valid transcript array found in update, received:', typeof update.transcript);
          }
        });

        // Start the call with proper configuration
        console.log('🚀 Starting call with access token...');
        
        const callConfig = {
          accessToken: accessToken,
          callId: callId,
          enableUpdate: true,
          sampleRate: 24000,
          // Ensure microphone is enabled
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };
        
        console.log('📋 Call config:', callConfig);
        await retellClientRef.current.startCall(callConfig);
        
        console.log('✅ Call started successfully!');

      } catch (error: any) {
        console.error('❌ Failed to initialize web call:', error);
        setError(`Failed to start call: ${error.message}`);
        setIsConnecting(false);
        // Reset initialization tracking on error
        initializationRef.current = null;
        
        // For demo purposes, show a placeholder that explains the integration
        setTimeout(() => {
          toast.error('SDK Integration in progress - Manual testing needed');
          setError('Web Call SDK integration in progress. Please check browser console for call details.');
        }, 1000);
      }
    };

  // Cleanup effect - only clean up intervals, not the call itself
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up web call component (intervals only)...');
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      // Note: Do NOT stop the call here - let webhook events handle call lifecycle
      // Only clean up when the call actually ends via webhook or user action
    };
  }, []);

  const toggleMute = () => {
    if (retellClientRef.current && isConnected) {
      try {
        retellClientRef.current.toggleMute();
        setIsMuted(!isMuted);
        toast.info(isMuted ? 'Microphone unmuted' : 'Microphone muted');
      } catch (error) {
        console.error('Failed to toggle mute:', error);
        toast.error('Failed to toggle microphone');
      }
    }
  };

  const endCall = () => {
    if (retellClientRef.current) {
      try {
        retellClientRef.current.stopCall();
      } catch (error) {
        console.log('Call already ended');
      }
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    toast.info('Call ended');
    
    // Pass transcript and duration data back to parent
    console.log('📤 SIMPLEWEBCALL: Passing call data to parent:', {
      transcriptLength: transcript.length,
      duration: callDuration,
      transcript: transcript.slice(0, 2) // Show first 2 entries for debug
    });
    
    onCallEnd?.({
      transcript,
      duration: callDuration
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (error && micPermission === 'denied') {
    return (
      <Card className="w-full max-w-4xl mx-auto border-2 border-red-200 dark:border-red-800">
        <CardHeader className="bg-red-50 dark:bg-red-900/20">
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Microphone Access Required</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <p className="text-red-600">{error}</p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium mb-2">🎤 How to enable microphone:</p>
              <ol className="text-xs space-y-1 list-decimal list-inside">
                <li>Click the <strong>🔒 lock icon</strong> in your browser's address bar</li>
                <li>Select <strong>"Allow"</strong> for microphone permissions</li>
                <li>Refresh the page and try again</li>
              </ol>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm"><strong>Call Details:</strong></p>
              <div className="text-xs font-mono mt-2 space-y-1">
                <div>Call ID: {callId}</div>
                <div>Access Token: {accessToken.substring(0, 30)}...</div>
                <div>Driver: {driverName}</div>
                <div>Load: {loadNumber}</div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={requestMicrophonePermission} variant="default">
                🎤 Try Again
              </Button>
              <Button onClick={() => onCallEnd?.({ transcript, duration: callDuration })} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto border-2 border-red-200 dark:border-red-800">
        <CardHeader className="bg-red-50 dark:bg-red-900/20">
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Web Call Issue</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <p className="text-red-600">{error}</p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm"><strong>Call Details:</strong></p>
              <div className="text-xs font-mono mt-2 space-y-1">
                <div>Call ID: {callId}</div>
                <div>Access Token: {accessToken.substring(0, 30)}...</div>
                <div>Driver: {driverName}</div>
                <div>Load: {loadNumber}</div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={() => onCallEnd?.({ transcript, duration: callDuration })} variant="outline">
                Close
              </Button>
              <Button 
                onClick={() => window.open(`https://docs.retellai.com/make-calls/web-call`, '_blank')}
                variant="secondary"
              >
                View Integration Docs
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto border-2 border-green-200 dark:border-green-800">
      <CardHeader className="bg-green-50 dark:bg-green-900/20">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Phone className="h-5 w-5 text-green-600" />
            <span>Web Call Session</span>
            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
              ACTIVE
            </span>
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            {isConnected ? formatDuration(callDuration) : 'Connecting...'}
          </div>
        </CardTitle>
        {(driverName || loadNumber) && (
          <div className="text-sm text-muted-foreground">
            {driverName && <span>Driver: <strong>{driverName}</strong></span>}
            {driverName && loadNumber && <span> • </span>}
            {loadNumber && <span>Load: <strong>{loadNumber}</strong></span>}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {/* Connection Status */}
        <div className="text-center py-4">
          {micPermission === 'pending' && isConnecting && (
            <div className="flex items-center justify-center space-x-3 text-blue-600">
              <Loader2 className="h-6 w-6 animate-spin" />
              <div>
                <p className="text-lg font-medium">Requesting microphone access...</p>
                <p className="text-sm text-muted-foreground">Please allow microphone permission in your browser</p>
              </div>
            </div>
          )}

          {micPermission === 'granted' && isConnecting && !isConnected && (
            <div className="flex items-center justify-center space-x-3 text-blue-600">
              <Loader2 className="h-6 w-6 animate-spin" />
              <div>
                <p className="text-lg font-medium">Connecting to voice agent...</p>
                <p className="text-sm text-muted-foreground">Preparing audio connection</p>
              </div>
            </div>
          )}

          {micPermission === 'denied' && (
            <div className="flex items-center justify-center space-x-3 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <div>
                <p className="text-lg font-medium">Microphone Permission Required</p>
                <p className="text-sm text-muted-foreground">Please allow microphone access to start the call</p>
                <Button 
                  onClick={requestMicrophonePermission}
                  size="sm"
                  className="mt-2"
                >
                  🎤 Request Permission
                </Button>
              </div>
            </div>
          )}
          
          {isConnected && (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-3 text-green-600">
                <div className="animate-pulse h-4 w-4 bg-green-500 rounded-full"></div>
                <span className="text-lg font-medium">🎙️ Connected - Start Speaking!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your microphone is active. Speak naturally to interact with the AI agent.
              </p>
            </div>
          )}
        </div>

        {/* Call Controls */}
        <div className="flex justify-center space-x-4">
          <Button
            onClick={toggleMute}
            variant={isMuted ? "destructive" : "default"}
            size="lg"
            disabled={!isConnected || micPermission !== 'granted'}
            className="flex items-center space-x-2 min-w-[140px]"
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
          </Button>

          <Button
            onClick={endCall}
            variant="destructive"
            size="lg"
            disabled={micPermission === 'pending'}
            className="flex items-center space-x-2 min-w-[140px]"
          >
            <PhoneOff className="h-5 w-5" />
            <span>End Call</span>
          </Button>
        </div>

        {/* Real-time Transcript */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Live Transcript</h3>
            <div className="text-xs text-muted-foreground">
              {transcript.length} message{transcript.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 h-80 overflow-y-auto border">
            {transcript.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{isConnected ? 'Start speaking to see the transcript...' : 'Waiting for connection...'}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {transcript.map((entry, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg transition-all ${
                      entry.role === 'agent' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 ml-0 mr-8 border-l-4 border-blue-500' 
                        : 'bg-green-100 dark:bg-green-900/30 ml-8 mr-0 border-l-4 border-green-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">
                        {entry.role === 'agent' ? '🤖 AI Agent' : '👤 You'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm leading-relaxed">{entry.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-muted rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Call ID:</span>
              <code className="ml-2 text-xs bg-background px-2 py-1 rounded">{callId}</code>
            </div>
            <div>
              <span className="font-medium">Status:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                isConnected ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                isConnecting ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              }`}>
                {isConnected ? 'Connected' : isConnecting ? 'Connecting' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          {isConnected && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  🎙️ Microphone is active - The AI agent can hear you
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
