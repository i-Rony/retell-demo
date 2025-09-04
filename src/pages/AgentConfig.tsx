import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Play, Trash2, Plus } from "lucide-react";
import AgentConfigForm from "@/components/forms/AgentConfigForm";
import { useAgentStore, agentSelectors } from "@/stores/agentStore";
import { useVoiceStore } from "@/stores/voiceStore";
import { useCallStore } from "@/stores/callStore";
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
  const { deleteAgent, fetchAgents, ensureAgentsLoaded } = useAgentStore();
  const { previewVoice, ensureVoicesLoaded, stopCurrentAudio } = useVoiceStore();
  const callStats = useCallStore(useShallow((state) => state.getCallStats()));
  const { ensureCallsLoaded } = useCallStore();

  // Voice preview function using centralized audio management
  const playVoicePreview = async (agent: any) => {
    try {
      await previewVoice(agent.voice);
      toast.success("Voice Preview", {
        description: `Playing ${agent.voice} preview for ${agent.name}`
      });
    } catch (error) {
      toast.error("Preview Failed", {
        description: error instanceof Error ? error.message : "Could not play voice preview"
      });
    }
  };

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, [stopCurrentAudio]);


  // Fetch agents, voices, and calls on component mount
  useEffect(() => {
    ensureAgentsLoaded();
    ensureVoicesLoaded();
    ensureCallsLoaded();
  }, [ensureAgentsLoaded, ensureVoicesLoaded, ensureCallsLoaded]);

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
                <div className="text-sm">
                  <div>
                    <p className="text-muted-foreground">Voice</p>
                    <p className="font-medium">{agent.voice}</p>
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
              <p className="text-2xl sm:text-3xl font-bold">{callStats.total}</p>
              <p className="text-sm text-muted-foreground">Total Calls</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold">
                {callStats.total > 0 ? `${callStats.successRate}%` : '--'}
              </p>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold">
                {callStats.total > 0 ? callStats.avgDuration : '--'}
              </p>
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
