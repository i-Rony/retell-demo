import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Play, Volume2, Settings2, MessageSquare, Zap } from "lucide-react";
import { useAgentStore, type Agent } from "@/stores/agentStore";
import { useVoiceStore } from "@/stores/voiceStore";

interface AgentConfigFormProps {
  agent?: Agent;
  onSave: () => void;
  onCancel: () => void;
}

export default function AgentConfigForm({ agent, onSave, onCancel }: AgentConfigFormProps) {
  const { addAgent, updateAgent } = useAgentStore();
  const { voices, ensureVoicesLoaded, previewVoice, stopCurrentAudio, isLoading: voicesLoading } = useVoiceStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: agent?.name || "",
    description: agent?.description || "",
    voice: agent?.voice || "11labs-Adrian", 
    temperature: agent?.temperature || 0.7,
    speed: agent?.speed || 1.0,
    volume: agent?.volume || 1.0,
    prompt: agent?.prompt || "",
    backchannelEnabled: agent?.backchannelEnabled ?? true,
    backchannelFrequency: agent?.backchannelFrequency || 0.8,
    backchannelWords: agent?.backchannelWords || [],
    interruptionSensitivity: agent?.interruptionSensitivity || 0.7,
    responsiveness: agent?.responsiveness || 0.9,
    pronunciation: agent?.pronunciation || [],
    boostedKeywords: agent?.boostedKeywords || []
  });

  // Load voices on component mount (only if not already loaded)
  useEffect(() => {
    ensureVoicesLoaded();
  }, [ensureVoicesLoaded]);

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, [stopCurrentAudio]);

  // Validation helper
  const isFormValid = () => {
    return formData.name.trim() !== "" && formData.prompt.trim() !== "";
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Prepare agent data for the store/backend
      const agentData = {
        name: formData.name,
        description: formData.description,
        voice: formData.voice,
        temperature: formData.temperature,
        speed: formData.speed,
        volume: formData.volume,
        prompt: formData.prompt,
        backchannelEnabled: formData.backchannelEnabled,
        backchannelFrequency: formData.backchannelFrequency,
        backchannelWords: formData.backchannelWords,
        interruptionSensitivity: formData.interruptionSensitivity,
        responsiveness: formData.responsiveness,
        pronunciation: formData.pronunciation,
        boostedKeywords: formData.boostedKeywords,
        status: 'active' as const
      };
      
      if (agent) {
        // Update existing agent
        await updateAgent(agent.id, agentData);
        toast.success("Agent Updated Successfully", {
          description: `${formData.name} has been updated.`
        });
      } else {
        // Create new agent
        await addAgent(agentData);
        toast.success("Agent Created Successfully", {
          description: `${formData.name} has been created.`
        });
      }
      
      onSave();
      
    } catch (error) {
      toast.error("Failed to save agent", {
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5 gap-1 mb-6 p-1 h-auto">
          <TabsTrigger value="basic" className="text-sm py-2.5">Basic Info</TabsTrigger>
          <TabsTrigger value="prompts" className="text-sm py-2.5">Prompts</TabsTrigger>
          <TabsTrigger value="voice" className="text-sm py-2.5">Voice & Audio</TabsTrigger>
          <TabsTrigger value="behavior" className="text-sm py-2.5">Behavior</TabsTrigger>
          <TabsTrigger value="advanced" className="text-sm py-2.5">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings2 className="h-5 w-5 mr-2" />
                Basic Configuration
              </CardTitle>
              <CardDescription>
                Set up the basic information for your AI voice agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Driver Check-in Agent"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of what this agent does..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                System Prompt
              </CardTitle>
              <CardDescription>
                Define how your agent should behave and respond
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="prompt">Main System Prompt *</Label>
                  <Textarea
                    id="prompt"
                    value={formData.prompt}
                    onChange={(e) => setFormData({...formData, prompt: e.target.value})}
                    placeholder="Enter a detailed system prompt that defines your agent's role, personality, goals, and conversation flow. For example, specify how the agent should greet callers, what information to collect, and how to handle different scenarios..."
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the core instruction that defines your agent's personality and behavior.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="keywords">Boosted Keywords</Label>
                  <Input
                    id="keywords"
                    value={formData.boostedKeywords.join(", ")}
                    onChange={(e) => setFormData({
                      ...formData, 
                      boostedKeywords: e.target.value.split(", ").filter(k => k.trim())
                    })}
                    placeholder="delivery, pickup, location, emergency"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated keywords that the agent should pay special attention to
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Volume2 className="h-5 w-5 mr-2" />
                Voice & Audio Settings
              </CardTitle>
              <CardDescription>
                Fine-tune voice characteristics and audio quality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Voice Selection */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label htmlFor="voice" className="text-base font-medium">Voice Selection</Label>
                <div className="flex gap-3">
                  <select 
                    id="voice"
                    value={formData.voice}
                    onChange={(e) => setFormData({...formData, voice: e.target.value})}
                    className="flex-[3] px-3 py-2 border border-input rounded-md bg-background"
                    disabled={voicesLoading}
                  >
                    {voicesLoading ? (
                      <option>Loading voices...</option>
                    ) : voices.length === 0 ? (
                      <option>No voices available</option>
                    ) : (
                      voices.map((voice) => (
                        <option key={voice.voice_id} value={voice.voice_id}>
                          {voice.voice_name} ({voice.provider}) - {voice.gender}, {voice.accent} {voice.age && `(${voice.age})`}
                        </option>
                      ))
                    )}
                  </select>
                  <Button 
                    variant="outline" 
                    disabled={voicesLoading || voices.length === 0}
                    onClick={async () => {
                      try {
                        await previewVoice(formData.voice);
                        
                        const selectedVoice = voices.find(v => v.voice_id === formData.voice);
                        toast.success("Voice Preview", {
                          description: `Playing ${selectedVoice?.voice_name || formData.voice} preview`
                        });
                      } catch (error) {
                        toast.error("Preview Failed", {
                          description: error instanceof Error ? error.message : "Could not play voice preview"
                        });
                      }
                    }}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {voicesLoading ? "Loading..." : "Voice Preview"}
                  </Button>
                </div>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Temperature: {formData.temperature}</Label>
                      <Badge variant="outline">{formData.temperature < 0.5 ? 'Conservative' : formData.temperature > 0.8 ? 'Creative' : 'Balanced'}</Badge>
                    </div>
                    <Slider
                      value={[formData.temperature]}
                      onValueChange={(value: number[]) => setFormData({...formData, temperature: value[0]})}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Controls creativity vs consistency in responses
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Speech Speed: {formData.speed}x</Label>
                    </div>
                    <Slider
                      value={[formData.speed]}
                      onValueChange={(value: number[]) => setFormData({...formData, speed: value[0]})}
                      max={2}
                      min={0.5}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Volume: {Math.round(formData.volume * 100)}%</Label>
                    </div>
                    <Slider
                      value={[formData.volume]}
                      onValueChange={(value: number[]) => setFormData({...formData, volume: value[0]})}
                      max={1}
                      min={0.1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Behavior</CardTitle>
              <CardDescription>
                Configure how the agent interacts during conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="backchannel">Enable Backchannel</Label>
                    <Switch
                      id="backchannel"
                      checked={formData.backchannelEnabled}
                      onCheckedChange={(checked: boolean) => setFormData({...formData, backchannelEnabled: checked})}
                    />
                  </div>
                  
                  {formData.backchannelEnabled && (
                    <div className="space-y-4 pl-4 border-l-2 border-primary/20 bg-muted/30 p-4 rounded-md">
                      <div className="space-y-2">
                        <Label>Frequency: {formData.backchannelFrequency}</Label>
                        <Slider
                          value={[formData.backchannelFrequency]}
                          onValueChange={(value: number[]) => setFormData({...formData, backchannelFrequency: value[0]})}
                          max={1}
                          min={0}
                          step={0.1}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Custom Words</Label>
                        <Input
                          value={formData.backchannelWords.join(", ")}
                          onChange={(e) => setFormData({
                            ...formData, 
                            backchannelWords: e.target.value.split(", ").filter(w => w.trim())
                          })}
                          placeholder="mm-hmm, okay, I see"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label>Interruption Sensitivity: {formData.interruptionSensitivity}</Label>
                    <Slider
                      value={[formData.interruptionSensitivity]}
                      onValueChange={(value: number[]) => setFormData({...formData, interruptionSensitivity: value[0]})}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      How easily the agent can be interrupted
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>Responsiveness: {formData.responsiveness}</Label>
                    <Slider
                      value={[formData.responsiveness]}
                      onValueChange={(value: number[]) => setFormData({...formData, responsiveness: value[0]})}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      How quickly the agent responds to input
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Advanced Settings
              </CardTitle>
              <CardDescription>
                Advanced configuration options for expert users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Pronunciation Dictionary</Label>
                  <div className="space-y-3">
                    {formData.pronunciation.map((item, index) => (
                      <div key={index} className="flex gap-3">
                        <Input
                          value={item.word}
                          onChange={(e) => {
                            const newPronunciation = [...formData.pronunciation];
                            newPronunciation[index] = { ...item, word: e.target.value };
                            setFormData({...formData, pronunciation: newPronunciation});
                          }}
                          placeholder="Word"
                          className="flex-1"
                        />
                        <Input
                          value={item.pronunciation}
                          onChange={(e) => {
                            const newPronunciation = [...formData.pronunciation];
                            newPronunciation[index] = { ...item, pronunciation: e.target.value };
                            setFormData({...formData, pronunciation: newPronunciation});
                          }}
                          placeholder="Pronunciation"
                          className="flex-1"
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData({
                        ...formData,
                        pronunciation: [...formData.pronunciation, { word: "", pronunciation: "" }]
                      })}
                      className="w-fit"
                    >
                      Add Pronunciation
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-end gap-3 pt-6 mt-8 border-t bg-background/50 -mx-6 px-6 py-4 rounded-b-lg">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isLoading || !isFormValid()}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? "Saving..." : (agent ? "Update Agent" : "Create Agent")}
        </Button>
      </div>
    </div>
  );
}
