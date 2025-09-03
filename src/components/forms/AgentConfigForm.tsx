import { useState } from "react";
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

interface AgentConfigFormProps {
  agent?: Agent;
  onSave: () => void;
  onCancel: () => void;
}

export default function AgentConfigForm({ agent, onSave, onCancel }: AgentConfigFormProps) {
  const { addAgent, updateAgent } = useAgentStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: agent?.name || "",
    description: agent?.description || "",
    voice: agent?.voice || "11labs-Adrian", 
    temperature: agent?.temperature || 0.7,
    speed: agent?.speed || 1.0,
    volume: agent?.volume || 1.0,
    prompt: agent?.prompt || `Role & Persona
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
    backchannelEnabled: agent?.backchannelEnabled ?? true,
    backchannelFrequency: agent?.backchannelFrequency || 0.8,
    backchannelWords: agent?.backchannelWords || ["mm-hmm", "okay", "I see", "right"],
    interruptionSensitivity: agent?.interruptionSensitivity || 0.7,
    responsiveness: agent?.responsiveness || 0.9,
    pronunciation: agent?.pronunciation || [
      { word: "ETA", pronunciation: "E-T-A" },
      { word: "GPS", pronunciation: "G-P-S" }
    ],
    boostedKeywords: agent?.boostedKeywords || ["delivery", "pickup", "location", "driver", "load", "emergency"]
  });

  const voices = [
    { id: "11labs-Adrian", name: "11Labs Adrian", description: "Clear, professional voice (Male)" },
    { id: "openai-Alloy", name: "OpenAI Alloy", description: "Neutral, balanced tone (Male)" },
    { id: "openai-Echo", name: "OpenAI Echo", description: "Warm, friendly voice (Male)" },
    { id: "openai-Nova", name: "OpenAI Nova", description: "Clear, professional tone (Female)" },
    { id: "openai-Shimmer", name: "OpenAI Shimmer", description: "Gentle, calming voice (Female)" },
    { id: "openai-Onyx", name: "OpenAI Onyx", description: "Deep, authoritative tone (Male)" },
    { id: "deepgram-Angus", name: "Deepgram Angus", description: "Natural, conversational voice (Male)" },
    { id: "11labs-Julia", name: "11Labs Julia", description: "Professional female voice (Female)" }
  ];

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
      console.error("Error saving agent:", error);
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
              <div className="grid gap-6 md:grid-cols-2">
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
                  <Label htmlFor="voice">Voice Selection</Label>
                  <select 
                    id="voice"
                    value={formData.voice}
                    onChange={(e) => setFormData({...formData, voice: e.target.value})}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    {voices.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} - {voice.description}
                      </option>
                    ))}
                  </select>
                </div>
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
                    placeholder="Define your agent's role, goals, and behavior..."
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

                  <div className="flex items-center justify-center p-4 border rounded-md bg-muted/30">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        // Play voice preview with current form settings
                        const utterance = new SpeechSynthesisUtterance(`Hello, this is ${formData.name || 'your agent'}. I'm ready to help with your dispatch needs.`);
                        utterance.rate = formData.speed || 1.0;
                        utterance.volume = formData.volume || 1.0;
                        
                        // Function to get voices and play
                        const getVoicesAndSpeak = () => {
                          const voices = speechSynthesis.getVoices();
                          
                          if (voices.length === 0) {
                            setTimeout(getVoicesAndSpeak, 100);
                            return;
                          }
                          
                          const voiceId = formData.voice.toLowerCase();
                          let matchingVoice = null;
                          
                          // Better gender-based voice mapping
                          if (voiceId.includes('julia') || voiceId.includes('shimmer') || voiceId.includes('nova')) {
                            // Female voices
                            matchingVoice = voices.find(voice => {
                              const name = voice.name.toLowerCase();
                              return name.includes('female') || 
                                     name.includes('woman') || 
                                     name.includes('samantha') || 
                                     name.includes('victoria') || 
                                     name.includes('karen') || 
                                     name.includes('zira') || 
                                     name.includes('susan') ||
                                     name.includes('fiona') ||
                                     name.includes('vicki');
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
                                     name.includes('fred') ||
                                     name.includes('thomas');
                            });
                          }
                          
                          // Fallback
                          if (!matchingVoice) {
                            matchingVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
                          }
                          
                          if (matchingVoice) {
                            utterance.voice = matchingVoice;
                            console.log(`Preview using voice: ${matchingVoice.name} for ${formData.voice}`);
                          }
                          
                          speechSynthesis.speak(utterance);
                        };
                        
                        getVoicesAndSpeak();
                        
                        toast.success("Voice Preview", {
                          description: `Testing ${formData.voice} voice settings`
                        });
                      }}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Test Voice Preview
                    </Button>
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
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? "Saving..." : (agent ? "Update Agent" : "Create Agent")}
        </Button>
      </div>
    </div>
  );
}
