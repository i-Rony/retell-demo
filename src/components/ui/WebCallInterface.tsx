import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Import Retell Web SDK
declare global {
  interface Window {
    RetellWebClient: any;
  }
}

interface WebCallInterfaceProps {
  callId: string;
  accessToken: string;
  onCallEnd?: () => void;
  driverName?: string;
  loadNumber?: string;
}

interface TranscriptEntry {
  role: 'agent' | 'user';
  content: string;
  timestamp: Date;
}

export default function WebCallInterface({ 
  callId, 
  accessToken, 
  onCallEnd,
  driverName,
  loadNumber 
}: WebCallInterfaceProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const retellClientRef = useRef<any>(null);
  const startTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load Retell Web SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/retell-client-js-sdk@latest/dist/web/index.js';
    script.async = true;
    script.onload = () => {
      console.log('🔗 Retell Web SDK loaded successfully');
      initializeCall();
    };
    script.onerror = () => {
      setError('Failed to load Retell Web SDK');
      toast.error('Failed to load calling interface');
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (retellClientRef.current) {
        retellClientRef.current.disconnect();
      }
      document.head.removeChild(script);
    };
  }, []);

  const initializeCall = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!window.RetellWebClient) {
        throw new Error('Retell Web SDK not loaded');
      }

      // Initialize Retell Web Client
      retellClientRef.current = new window.RetellWebClient();

      // Set up event listeners
      retellClientRef.current.on('call_started', () => {
        console.log('📞 Call started');
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

        toast.success('Call connected successfully!');
      });

      retellClientRef.current.on('call_ended', () => {
        console.log('📞 Call ended');
        setIsConnected(false);
        setIsConnecting(false);
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }
        toast.info('Call ended');
        onCallEnd?.();
      });

      retellClientRef.current.on('error', (error: any) => {
        console.error('❌ Call error:', error);
        setError(`Call error: ${error.message || 'Unknown error'}`);
        setIsConnected(false);
        setIsConnecting(false);
        toast.error('Call error occurred');
      });

      retellClientRef.current.on('update', (update: any) => {
        console.log('📝 Call update:', update);
        
        // Handle transcript updates
        if (update.transcript) {
          const newEntry: TranscriptEntry = {
            role: update.role || 'agent',
            content: update.transcript,
            timestamp: new Date()
          };
          setTranscript(prev => [...prev, newEntry]);
        }
      });

      // Start the call
      await retellClientRef.current.startCall({
        callId: callId,
        accessToken: accessToken,
        enableUpdate: true, // Enable real-time updates
        customData: {
          driver_name: driverName,
          load_number: loadNumber
        }
      });

    } catch (error: any) {
      console.error('❌ Failed to initialize call:', error);
      setError(`Failed to start call: ${error.message}`);
      setIsConnecting(false);
      toast.error('Failed to start call');
    }
  };

  const toggleMute = () => {
    if (retellClientRef.current) {
      retellClientRef.current.toggleMute();
      setIsMuted(!isMuted);
      toast.info(isMuted ? 'Microphone unmuted' : 'Microphone muted');
    }
  };

  const toggleSpeaker = () => {
    if (retellClientRef.current) {
      retellClientRef.current.toggleSpeaker();
      setIsSpeakerMuted(!isSpeakerMuted);
      toast.info(isSpeakerMuted ? 'Speaker unmuted' : 'Speaker muted');
    }
  };

  const endCall = () => {
    if (retellClientRef.current) {
      retellClientRef.current.disconnect();
      setIsConnected(false);
      setIsConnecting(false);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      toast.info('Call ended');
      onCallEnd?.();
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-red-600">Call Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={onCallEnd} variant="outline">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Phone className="h-5 w-5" />
            <span>Web Call</span>
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            {isConnected ? `${formatDuration(callDuration)}` : 'Connecting...'}
          </div>
        </CardTitle>
        {(driverName || loadNumber) && (
          <div className="text-sm text-muted-foreground">
            {driverName && <span>Driver: {driverName}</span>}
            {driverName && loadNumber && <span> • </span>}
            {loadNumber && <span>Load: {loadNumber}</span>}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Call Status */}
        <div className="text-center">
          {isConnecting && (
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Connecting to agent...</span>
            </div>
          )}
          
          {isConnected && (
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <div className="animate-pulse h-3 w-3 bg-green-500 rounded-full"></div>
              <span>Connected - Speak now!</span>
            </div>
          )}
        </div>

        {/* Call Controls */}
        <div className="flex justify-center space-x-4">
          <Button
            onClick={toggleMute}
            variant={isMuted ? "destructive" : "outline"}
            size="lg"
            disabled={!isConnected}
            className="flex items-center space-x-2"
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </Button>

          <Button
            onClick={toggleSpeaker}
            variant={isSpeakerMuted ? "destructive" : "outline"}
            size="lg"
            disabled={!isConnected}
            className="flex items-center space-x-2"
          >
            {isSpeakerMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            <span>{isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}</span>
          </Button>

          <Button
            onClick={endCall}
            variant="destructive"
            size="lg"
            disabled={!isConnected && !isConnecting}
            className="flex items-center space-x-2"
          >
            <PhoneOff className="h-5 w-5" />
            <span>End Call</span>
          </Button>
        </div>

        {/* Real-time Transcript */}
        <div className="space-y-4">
          <h3 className="font-semibold">Live Transcript</h3>
          <div className="bg-muted rounded-lg p-4 h-64 overflow-y-auto">
            {transcript.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {isConnected ? 'Transcript will appear here as you speak...' : 'Waiting for call to connect...'}
              </p>
            ) : (
              <div className="space-y-2">
                {transcript.map((entry, index) => (
                  <div 
                    key={index}
                    className={`p-2 rounded ${
                      entry.role === 'agent' 
                        ? 'bg-blue-100 dark:bg-blue-900/20' 
                        : 'bg-green-100 dark:bg-green-900/20'
                    }`}
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      {entry.role === 'agent' ? '🤖 Agent' : '👤 You'} • {entry.timestamp.toLocaleTimeString()}
                    </div>
                    <div className="text-sm">{entry.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Call Info */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <div>Call ID: {callId}</div>
          {isConnected && (
            <div className="text-green-600">
              🎙️ Microphone active - Speak naturally to the agent
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
