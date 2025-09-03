import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Play, Trash2, Plus } from "lucide-react";
import AgentConfigForm from "@/components/forms/AgentConfigForm";
import { useAgentStore, agentSelectors } from "@/stores/agentStore";
import { useShallow } from 'zustand/react/shallow';
import { toast } from "sonner";

export default function AgentConfig() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Use Zustand stores
  const agents = useAgentStore(agentSelectors.agents);
  const agentStats = useAgentStore(useShallow((state) => state.getAgentStats()));
  const isLoading = useAgentStore((state) => state.isLoading);
  const error = useAgentStore((state) => state.error);
  const { deleteAgent, fetchAgents } = useAgentStore();

  // Voice preview function with better mapping
  const playVoicePreview = (agent: any) => {
    const utterance = new SpeechSynthesisUtterance(`Hello, this is ${agent.name}. I'm ready to help with your dispatch needs.`);
    utterance.rate = agent.speed || 1.0;
    utterance.volume = agent.volume || 1.0;
    
    // Function to get voices (handles loading state)
    const getVoicesAndSpeak = () => {
      const voices = speechSynthesis.getVoices();
      
      if (voices.length === 0) {
        // Voices not loaded yet, try again after a delay
        setTimeout(getVoicesAndSpeak, 100);
        return;
      }
      
      console.log('Available voices:', voices.map(v => ({ name: v.name, lang: v.lang, gender: v.name })));
      
      const voiceId = agent.voice.toLowerCase();
      let matchingVoice = null;
      
      // More comprehensive voice mapping
      if (voiceId.includes('julia') || voiceId.includes('shimmer') || voiceId.includes('nova') || voiceId.includes('echo')) {
        // Female voices - try multiple patterns
        matchingVoice = voices.find(voice => {
          const name = voice.name.toLowerCase();
          return name.includes('female') || 
                 name.includes('woman') || 
                 name.includes('samantha') || 
                 name.includes('victoria') || 
                 name.includes('karen') || 
                 name.includes('zira') || 
                 name.includes('susan') ||
                 name.includes('fiona');
        });
      } else {
        // Male voices
        matchingVoice = voices.find(voice => {
          const name = voice.name.toLowerCase();
          return name.includes('male') || 
                 name.includes('man') || 
                 name.includes('david') || 
                 name.includes('mark') || 
                 name.includes('daniel') || 
                 name.includes('alex') ||
                 name.includes('fred');
        });
      }
      
      // Final fallback - get the best English voice
      if (!matchingVoice) {
        matchingVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
      }
      
      if (matchingVoice) {
        utterance.voice = matchingVoice;
        console.log(`Using voice: ${matchingVoice.name} for agent voice: ${agent.voice}`);
      }
      
      speechSynthesis.speak(utterance);
    };
    
    getVoicesAndSpeak();
    
    toast.success("Voice Preview", {
      description: `Playing ${agent.voice} voice preview for ${agent.name}`
    });
  };

  // Fetch agents from Retell API and load voices on component mount
  useEffect(() => {
    console.log('🔄 AgentConfig: Loading agents from Retell API...');
    fetchAgents();
    
    // Load speech synthesis voices
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.addEventListener('voiceschanged', () => {
        const voices = speechSynthesis.getVoices();
        console.log('🎤 Available system voices:', voices.map(v => ({ 
          name: v.name, 
          lang: v.lang, 
          gender: v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman') ? 'female' : 'male'
        })));
      });
    }
  }, [fetchAgents]);

  if (selectedAgent || isCreating) {
    const agent = agents.find(a => a.id === selectedAgent);
    return (
      <div className="w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {isCreating ? "Create New Agent" : `Edit ${agent?.name}`}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isCreating ? "Configure a new AI voice agent" : "Modify agent settings and behavior"}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedAgent(null);
              setIsCreating(false);
            }}
            className="w-fit"
          >
            Back to Agents
          </Button>
        </div>
        
        <AgentConfigForm 
          agent={agent} 
          onSave={() => {
            setSelectedAgent(null);
            setIsCreating(false);
          }}
          onCancel={() => {
            setSelectedAgent(null);
            setIsCreating(false);
          }}
        />
      </div>
    );
  }

  // Show loading state
  if (isLoading && agents.length === 0) {
    return (
      <div className="w-full space-y-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading agents from API...</p>
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
            <button 
              onClick={() => fetchAgents()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Try Again
            </button>
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
            Agent Configuration 
            {/* API STATUS INDICATOR */}
            <span className="text-sm font-normal text-green-600 ml-2">(Live API)</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your AI voice agents with custom prompts and settings.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          Create Agent
        </Button>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {agent.description}
                  </CardDescription>
                </div>
                <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                  {agent.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Voice</p>
                    <p className="font-medium">{agent.voice}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Calls Today</p>
                    <p className="font-medium">{agent.callsToday}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(agent.updatedAt).toLocaleDateString()}
                  </p>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAgent(agent.id)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => playVoicePreview(agent)}
                      title="Play voice preview"
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this agent?')) {
                          deleteAgent(agent.id);
                          toast.success("Agent Deleted", {
                            description: `${agent.name} has been deleted`
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>
            Overview of your agent performance today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 grid-cols-2 md:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold">{agentStats.totalCallsToday}</p>
              <p className="text-sm text-muted-foreground">Total Calls Today</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold">89%</p>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold">2:31</p>
              <p className="text-sm text-muted-foreground">Avg Duration</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold">{agentStats.active}</p>
              <p className="text-sm text-muted-foreground">Active Agents</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
