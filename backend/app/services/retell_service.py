from retell import Retell
from typing import List, Optional
from app.models.agent import Agent, AgentCreate, AgentUpdate, ResponseEngine, PronunciationEntry
from app.models.call import Call, CallCreate, ExtractedData
import json
from datetime import datetime

class RetellService:
    def __init__(self, api_key: str):
        print(f"🔧 RetellService: Initializing with API key length: {len(api_key) if api_key else 0}")
        if not api_key:
            raise ValueError("❌ Retell AI API key is required")
        self.client = Retell(api_key=api_key)
        print(f"✅ RetellService: Client initialized successfully")
    
    async def list_agents_raw(self) -> List[dict]:
        """List all agents from Retell AI - returns raw API response"""
        try:
            response = self.client.agent.list()
            return list(response)  # Convert to list if it's not already
        except Exception as e:
            print(f"Error listing agents: {e}")
            return []
    
    async def list_agents(self) -> List[Agent]:
        """List all agents from Retell AI"""
        try:
            response = self.client.agent.list()
            agents = []
            for agent_data in response:
                agent = Agent(
                    id=agent_data.get("agent_id"),
                    retell_agent_id=agent_data.get("agent_id"),
                    name=agent_data.get("agent_name", "Unknown"),
                    description=agent_data.get("response_engine", {}).get("llm_id", ""),
                    voice=agent_data.get("voice_id", "alloy"),
                    temperature=0.7,  # Default values since not directly available
                    prompt=agent_data.get("response_engine", {}).get("general_prompt", ""),
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                    calls_today=0
                )
                agents.append(agent)
            return agents
        except Exception as e:
            print(f"Error listing agents: {e}")
            return []
    
    async def get_agent(self, agent_id: str) -> Optional[Agent]:
        """Get a specific agent by ID"""
        try:
            retell_agent = self.client.agent.retrieve(agent_id)
            
            # Convert response to dict if it's a Pydantic model
            agent_dict = retell_agent.model_dump() if hasattr(retell_agent, 'model_dump') else retell_agent.__dict__
            
            # Extract prompt from LLM if available
            prompt = ""
            response_engine = agent_dict.get("response_engine", {})
            if response_engine.get("type") == "retell-llm" and response_engine.get("llm_id"):
                llm_details = await self.get_retell_llm(response_engine.get("llm_id"))
                if llm_details:
                    prompt = llm_details.get("general_prompt", "")
            
            return Agent(
                id=agent_dict.get("agent_id"),
                agent_id=agent_dict.get("agent_id"),
                agent_name=agent_dict.get("agent_name"),
                description=agent_dict.get("description", ""),
                prompt=prompt,
                voice_id=agent_dict.get("voice_id"),
                voice_temperature=agent_dict.get("voice_temperature"),
                voice_speed=agent_dict.get("voice_speed"),
                volume=agent_dict.get("volume"),
                responsiveness=agent_dict.get("responsiveness"),
                interruption_sensitivity=agent_dict.get("interruption_sensitivity"),
                enable_backchannel=agent_dict.get("enable_backchannel"),
                backchannel_frequency=agent_dict.get("backchannel_frequency"),
                backchannel_words=agent_dict.get("backchannel_words"),
                response_engine=ResponseEngine(**agent_dict.get("response_engine", {})),
                created_at=datetime.now(),
                updated_at=datetime.now(),
                calls_today=0,
                version=agent_dict.get("version", 0),
                is_published=agent_dict.get("is_published", False),
                last_modification_timestamp=agent_dict.get("last_modification_timestamp"),
                language=agent_dict.get("language"),
                webhook_url=agent_dict.get("webhook_url"),
                boosted_keywords=agent_dict.get("boosted_keywords"),
                pronunciation_dictionary=[
                    PronunciationEntry(**entry) for entry in agent_dict.get("pronunciation_dictionary", [])
                ] if agent_dict.get("pronunciation_dictionary") else None,
                normalize_for_speech=agent_dict.get("normalize_for_speech"),
                end_call_after_silence_ms=agent_dict.get("end_call_after_silence_ms"),
                max_call_duration_ms=agent_dict.get("max_call_duration_ms")
            )
        except Exception as e:
            print(f"Error getting agent {agent_id}: {e}")
            return None
    
    async def create_retell_llm(self, prompt: str, model: str = "gpt-4o", temperature: float = 0.1) -> str:
        """Create a Retell LLM with the given prompt and return the LLM ID"""
        try:
            llm_params = {
                "general_prompt": prompt,
                "model": model,
                "model_temperature": temperature,
                "model_high_priority": True,
                "tool_call_strict_mode": True,
                "general_tools": [
                    {
                        "type": "end_call",
                        "name": "end_call",
                        "description": "End the call with user."
                    }
                ]
            }
            
            print(f"Creating Retell LLM with params: {llm_params}")
            llm_response = self.client.llm.create(**llm_params)
            
            # Convert response to dict if it's a Pydantic model
            llm_dict = llm_response.model_dump() if hasattr(llm_response, 'model_dump') else llm_response.__dict__
            llm_id = llm_dict.get("llm_id")
            
            print(f"✅ Created Retell LLM with ID: {llm_id}")
            return llm_id
            
        except Exception as e:
            print(f"Error creating Retell LLM: {e}")
            raise

    async def create_agent(self, agent_data: AgentCreate) -> Agent:
        """Create a new agent in Retell AI"""
        try:
            # First, create the Retell LLM with the prompt
            prompt = agent_data.prompt
            if not prompt:
                prompt = "You are a helpful AI assistant."
                
            llm_id = await self.create_retell_llm(prompt, temperature=agent_data.voice_temperature or 0.1)
            
            # Now create the agent with the LLM ID
            create_params = {
                "response_engine": {
                    "type": "retell-llm",
                    "llm_id": llm_id,
                },
                "voice_id": agent_data.voice_id or "11labs-Adrian",
            }
            
            # Add optional parameters if provided
            if agent_data.agent_name:
                create_params["agent_name"] = agent_data.agent_name
            if agent_data.voice_temperature is not None:
                create_params["voice_temperature"] = agent_data.voice_temperature
            if agent_data.voice_speed is not None:
                create_params["voice_speed"] = agent_data.voice_speed
            if agent_data.volume is not None:
                create_params["volume"] = agent_data.volume
            if agent_data.responsiveness is not None:
                create_params["responsiveness"] = agent_data.responsiveness
            if agent_data.interruption_sensitivity is not None:
                create_params["interruption_sensitivity"] = agent_data.interruption_sensitivity
            if agent_data.enable_backchannel is not None:
                create_params["enable_backchannel"] = agent_data.enable_backchannel
            if agent_data.backchannel_frequency is not None:
                create_params["backchannel_frequency"] = agent_data.backchannel_frequency
            if agent_data.backchannel_words:
                create_params["backchannel_words"] = agent_data.backchannel_words
            if agent_data.language:
                create_params["language"] = agent_data.language
            if agent_data.webhook_url:
                create_params["webhook_url"] = agent_data.webhook_url
            if agent_data.boosted_keywords:
                create_params["boosted_keywords"] = agent_data.boosted_keywords
            if agent_data.pronunciation_dictionary:
                create_params["pronunciation_dictionary"] = [
                    {
                        "word": entry.word,
                        "alphabet": entry.alphabet,
                        "phoneme": entry.phoneme
                    } for entry in agent_data.pronunciation_dictionary
                ]
            if agent_data.normalize_for_speech is not None:
                create_params["normalize_for_speech"] = agent_data.normalize_for_speech
            if agent_data.end_call_after_silence_ms is not None:
                create_params["end_call_after_silence_ms"] = agent_data.end_call_after_silence_ms
            if agent_data.max_call_duration_ms is not None:
                create_params["max_call_duration_ms"] = agent_data.max_call_duration_ms
            
            print(f"Creating agent with params: {create_params}")
            
            # Create agent in Retell AI
            retell_agent = self.client.agent.create(**create_params)
            
            # Convert response to dict if it's a Pydantic model
            agent_dict = retell_agent.model_dump() if hasattr(retell_agent, 'model_dump') else retell_agent.__dict__
            
            # Return Agent model
            return Agent(
                id=agent_dict.get("agent_id"),
                agent_id=agent_dict.get("agent_id"),
                agent_name=agent_dict.get("agent_name"),
                description=agent_data.description,
                prompt=prompt,  # Include the prompt that was used to create the LLM
                voice_id=agent_dict.get("voice_id"),
                voice_temperature=agent_dict.get("voice_temperature"),
                voice_speed=agent_dict.get("voice_speed"),
                volume=agent_dict.get("volume"),
                responsiveness=agent_dict.get("responsiveness"),
                interruption_sensitivity=agent_dict.get("interruption_sensitivity"),
                enable_backchannel=agent_dict.get("enable_backchannel"),
                backchannel_frequency=agent_dict.get("backchannel_frequency"),
                backchannel_words=agent_dict.get("backchannel_words"),
                response_engine=ResponseEngine(**agent_dict.get("response_engine", {})),
                created_at=datetime.now(),
                updated_at=datetime.now(),
                calls_today=0,
                version=agent_dict.get("version", 0),
                is_published=agent_dict.get("is_published", False),
                last_modification_timestamp=agent_dict.get("last_modification_timestamp")
            )
        except Exception as e:
            print(f"Error creating agent: {e}")
            raise
    
    async def update_agent(self, agent_id: str, agent_data: AgentUpdate) -> Optional[Agent]:
        """Update an existing agent"""
        try:
            # Get the current agent to check if we need to update the LLM
            current_agent = self.client.agent.retrieve(agent_id)
            current_agent_dict = current_agent.model_dump() if hasattr(current_agent, 'model_dump') else current_agent.__dict__
            
            update_params = {}
            
            # If prompt is being updated, we need to create a new LLM
            if agent_data.prompt is not None:
                llm_id = await self.create_retell_llm(agent_data.prompt, temperature=agent_data.voice_temperature or 0.1)
                update_params["response_engine"] = {
                    "type": "retell-llm",
                    "llm_id": llm_id,
                }
            
            # Add other parameters that are provided in the update request
            if agent_data.agent_name is not None:
                update_params["agent_name"] = agent_data.agent_name
            if agent_data.voice_id is not None:
                update_params["voice_id"] = agent_data.voice_id
            if agent_data.voice_temperature is not None:
                update_params["voice_temperature"] = agent_data.voice_temperature
            if agent_data.voice_speed is not None:
                update_params["voice_speed"] = agent_data.voice_speed
            if agent_data.volume is not None:
                update_params["volume"] = agent_data.volume
            if agent_data.responsiveness is not None:
                update_params["responsiveness"] = agent_data.responsiveness
            if agent_data.interruption_sensitivity is not None:
                update_params["interruption_sensitivity"] = agent_data.interruption_sensitivity
            if agent_data.enable_backchannel is not None:
                update_params["enable_backchannel"] = agent_data.enable_backchannel
            if agent_data.backchannel_frequency is not None:
                update_params["backchannel_frequency"] = agent_data.backchannel_frequency
            if agent_data.backchannel_words is not None:
                update_params["backchannel_words"] = agent_data.backchannel_words
            if agent_data.language is not None:
                update_params["language"] = agent_data.language
            if agent_data.webhook_url is not None:
                update_params["webhook_url"] = agent_data.webhook_url
            if agent_data.boosted_keywords is not None:
                update_params["boosted_keywords"] = agent_data.boosted_keywords
            if agent_data.pronunciation_dictionary is not None:
                update_params["pronunciation_dictionary"] = [
                    {
                        "word": entry.word,
                        "alphabet": entry.alphabet,
                        "phoneme": entry.phoneme
                    } for entry in agent_data.pronunciation_dictionary
                ]
            if agent_data.normalize_for_speech is not None:
                update_params["normalize_for_speech"] = agent_data.normalize_for_speech
            if agent_data.end_call_after_silence_ms is not None:
                update_params["end_call_after_silence_ms"] = agent_data.end_call_after_silence_ms
            if agent_data.max_call_duration_ms is not None:
                update_params["max_call_duration_ms"] = agent_data.max_call_duration_ms
            
            print(f"Updating agent {agent_id} with params: {update_params}")
            
            retell_agent = self.client.agent.update(agent_id, **update_params)
            
            # Convert response to dict if it's a Pydantic model
            agent_dict = retell_agent.model_dump() if hasattr(retell_agent, 'model_dump') else retell_agent.__dict__
            
            # Extract prompt from updated LLM if available
            updated_prompt = agent_data.prompt
            if not updated_prompt:
                # If prompt wasn't updated, try to get it from the LLM
                response_engine = agent_dict.get("response_engine", {})
                if response_engine.get("type") == "retell-llm" and response_engine.get("llm_id"):
                    llm_details = await self.get_retell_llm(response_engine.get("llm_id"))
                    if llm_details:
                        updated_prompt = llm_details.get("general_prompt", "")
            
            return Agent(
                id=agent_dict.get("agent_id"),
                agent_id=agent_dict.get("agent_id"),
                agent_name=agent_dict.get("agent_name"),
                description=agent_data.description or agent_dict.get("description", ""),
                prompt=updated_prompt or "",
                voice_id=agent_dict.get("voice_id"),
                voice_temperature=agent_dict.get("voice_temperature"),
                voice_speed=agent_dict.get("voice_speed"),
                volume=agent_dict.get("volume"),
                responsiveness=agent_dict.get("responsiveness"),
                interruption_sensitivity=agent_dict.get("interruption_sensitivity"),
                enable_backchannel=agent_dict.get("enable_backchannel"),
                backchannel_frequency=agent_dict.get("backchannel_frequency"),
                backchannel_words=agent_dict.get("backchannel_words"),
                response_engine=ResponseEngine(**agent_dict.get("response_engine", {})),
                created_at=datetime.now(),
                updated_at=datetime.now(),
                calls_today=0,
                version=agent_dict.get("version", 0),
                is_published=agent_dict.get("is_published", False),
                last_modification_timestamp=agent_dict.get("last_modification_timestamp")
            )
        except Exception as e:
            print(f"Error updating agent {agent_id}: {e}")
            return None
    
    async def delete_agent(self, agent_id: str) -> bool:
        """Delete an agent"""
        try:
            self.client.agent.delete(agent_id)
            return True
        except Exception as e:
            print(f"Error deleting agent {agent_id}: {e}")
            return False
    
    async def get_agent_versions(self, agent_id: str) -> List[dict]:
        """Get all versions of an agent"""
        try:
            versions = self.client.agent.get_versions(agent_id)
            return list(versions) if versions else []
        except Exception as e:
            print(f"Error getting agent versions for {agent_id}: {e}")
            return []
    
    async def get_retell_llm(self, llm_id: str) -> Optional[dict]:
        """Get Retell LLM details by ID"""
        try:
            llm_response = self.client.llm.retrieve(llm_id)
            llm_dict = llm_response.model_dump() if hasattr(llm_response, 'model_dump') else llm_response.__dict__
            return llm_dict
        except Exception as e:
            print(f"Error getting LLM {llm_id}: {e}")
            return None
    
    async def list_retell_llms(self) -> List[dict]:
        """List all Retell LLMs"""
        try:
            llms = self.client.llm.list()
            return list(llms) if llms else []
        except Exception as e:
            print(f"Error listing LLMs: {e}")
            return []
    
    async def create_phone_call(self, call_data: CallCreate) -> Call:
        """Create/initiate a new phone call"""
        try:
            # Create phone call in Retell AI using correct Python SDK method
            retell_call = self.client.call.create_phone_call(
                agent_id=call_data.agent_id,
                from_number="+15103183385",  # Your Retell number
                to_number=call_data.phone_number,
                retell_llm_dynamic_variables={
                    "driver_name": call_data.driver_name,
                    "phone_number": call_data.phone_number,
                    "load_number": call_data.load_number,
                    "pickup_location": call_data.pickup_location or "",
                    "delivery_location": call_data.delivery_location or "",
                    "scenario": call_data.scenario
                }
            )
            
            return Call(
                id=retell_call.call_id,
                retell_call_id=retell_call.call_id,
                driver_name=call_data.driver_name,
                phone_number=call_data.phone_number,
                load_number=call_data.load_number,
                agent_id=call_data.agent_id,
                scenario=call_data.scenario,
                pickup_location=call_data.pickup_location,
                delivery_location=call_data.delivery_location,
                estimated_pickup_time=call_data.estimated_pickup_time,
                notes=call_data.notes,
                status="pending",
                timestamp=datetime.now()
            )
        except Exception as e:
            print(f"Error creating phone call: {e}")
            raise
    
    async def create_web_call(self, agent_id: str, dynamic_variables: dict = None) -> dict:
        """Create a web call for browser-based calling"""
        try:
            # Create web call in Retell AI using the correct SDK method  
            web_call_response = self.client.call.create_web_call(
                agent_id=agent_id,
                retell_llm_dynamic_variables=dynamic_variables or {}
            )
            
            print(f"✅ Web call created successfully:")
            print(f"📞 Call ID: {web_call_response.call_id}")
            print(f"🔑 Access Token: {web_call_response.access_token[:20]}...")
            print(f"🚀 Ready for browser connection!")
            
            return {
                "call_id": web_call_response.call_id,
                "access_token": web_call_response.access_token,
                "agent_id": web_call_response.agent_id,
                "call_type": "web_call"
            }
            
        except Exception as e:
            print(f"Error creating web call: {e}")
            raise
    
    async def create_simple_phone_call(self, to_number: str, agent_id: str, dynamic_variables: dict = None) -> dict:
        """Create a simple phone call with minimal parameters"""
        try:
            # Create phone call using the Retell SDK with keyword arguments
            phone_call_response = self.client.call.create_phone_call(
                agent_id=agent_id,
                from_number="+15103183385",  # Your Retell number
                to_number=to_number,
                retell_llm_dynamic_variables=dynamic_variables or {}
            )
            
            print(f"✅ Phone call initiated successfully:")
            print(f"📞 Call ID: {phone_call_response.call_id}")
            print(f"📱 From: +15103183385")
            print(f"📱 To: {to_number}")
            print(f"🤖 Agent: {agent_id}")
            
            return {
                "call_id": phone_call_response.call_id,
                "agent_id": phone_call_response.agent_id,
                "from_number": "+15103183385",
                "to_number": to_number,
                "call_type": "phone_call",
                "status": "initiated"
            }
            
        except Exception as e:
            print(f"Error creating phone call: {e}")
            raise
    
    async def get_call(self, call_id: str) -> Optional[Call]:
        """Get call details with full transcript and extracted data"""
        try:
            call_response = self.client.call.retrieve(call_id)
            # Convert Pydantic model to dictionary for easier access
            call_data = call_response.model_dump() if hasattr(call_response, 'model_dump') else call_response.__dict__
            
            # Extract dynamic variables for driver/load context - handle None case
            dynamic_vars = call_data.get("retell_llm_dynamic_variables") or {}
            driver_name = dynamic_vars.get("driver_name", "Unknown Driver")
            load_number = dynamic_vars.get("load_number", "Unknown Load")
            scenario = dynamic_vars.get("scenario", dynamic_vars.get("context", "Unknown"))
            
            # Convert transcript from Retell format to our format
            transcript = []
            if call_data.get("transcript_object"):
                for entry in call_data["transcript_object"]:
                    # Map Retell transcript roles to our speaker types
                    speaker = "Agent" if entry.get("role") == "agent" else "Driver"
                    
                    # Get timestamp from first word if available
                    start_time = 0
                    if entry.get("words") and len(entry["words"]) > 0:
                        start_time = entry["words"][0].get("start", 0)
                    
                    transcript.append({
                        "speaker": speaker,
                        "text": entry.get("content", ""),
                        "timestamp": f"{int(start_time)//60}:{int(start_time)%60:02d}"
                    })
            
            # Extract call analysis/extracted data
            call_analysis = call_data.get("call_analysis", {})
            custom_analysis = call_analysis.get("custom_analysis_data") or {}
            extracted_data = ExtractedData(
                current_location=dynamic_vars.get("current_location"),
                estimated_arrival=dynamic_vars.get("estimated_arrival"), 
                driver_status=custom_analysis.get("driver_status"),
                issues=custom_analysis.get("issues"),
                scenario_type=scenario
            )
            
            # Calculate duration (timestamps are in milliseconds)
            duration_ms = call_data.get("duration_ms", 0)
            if not duration_ms and call_data.get("end_timestamp") and call_data.get("start_timestamp"):
                duration_ms = call_data.get("end_timestamp") - call_data.get("start_timestamp")
            duration = f"{duration_ms//60000}:{(duration_ms%60000)//1000:02d}" if duration_ms > 0 else "0:00"
            
            # Map call status
            status_mapping = {
                "registered": "pending",
                "ongoing": "in-progress", 
                "ended": "completed",
                "error": "failed"
            }
            status = status_mapping.get(call_data.get("call_status", "unknown"), "unknown")
            
            return Call(
                id=call_data.get("call_id"),
                retell_call_id=call_data.get("call_id"),
                driver_name=driver_name,
                phone_number=call_data.get("to_number", call_data.get("from_number", "")),
                load_number=load_number,
                agent_id=call_data.get("agent_id"),
                scenario=scenario,
                status=status,
                duration=duration,
                timestamp=datetime.fromtimestamp(call_data.get("start_timestamp", 0) / 1000) if call_data.get("start_timestamp") else datetime.now(),
                outcome=call_analysis.get("call_summary", f"Call {status}"),
                confidence=0.95 if call_analysis.get("call_successful") else 0.3,
                extracted_data=extracted_data,
                transcript=transcript,
                pickup_location=dynamic_vars.get("pickup_location"),
                delivery_location=dynamic_vars.get("delivery_location"),
                estimated_pickup_time=dynamic_vars.get("estimated_pickup_time"),
                notes=dynamic_vars.get("notes")
            )
        except Exception as e:
            print(f"Error getting call {call_id}: {e}")
            return None
    
    async def list_calls(self) -> List[Call]:
        """List all calls from Retell AI using client.call.list()"""
        try:
            print(f"🔍 Calling Retell AI list calls API...")
            print(f"🔑 Using API key: {self.client.api_key[:20]}..." if self.client.api_key else "❌ No API key")
            
            response = self.client.call.list()
            response_list = list(response)
            print(f"📊 Retell AI returned {len(response_list)} calls")
            
            if len(response_list) == 0:
                print("ℹ️ No calls found in Retell AI account")
                print("💡 Note: Make sure calls exist in your Retell AI dashboard")
                return []
            
            # Debug: print first call structure  
            first_call = response_list[0]
            # Convert Pydantic model to dictionary for debugging
            first_call_dict = first_call.model_dump() if hasattr(first_call, 'model_dump') else first_call.__dict__
            print(f"📋 Sample call structure keys: {list(first_call_dict.keys())}")
            print(f"📋 Sample call ID: {getattr(first_call, 'call_id', 'unknown')}")
            print(f"📋 Sample call status: {getattr(first_call, 'call_status', 'unknown')}")
            print(f"📋 Sample call type: {type(first_call)}")
            
            calls = []
            for call_obj in response_list:
                # Convert Pydantic model to dictionary for easier access
                call_data = call_obj.model_dump() if hasattr(call_obj, 'model_dump') else call_obj.__dict__
                # Extract dynamic variables for driver/load context - handle None case
                dynamic_vars = call_data.get("retell_llm_dynamic_variables") or {}
                driver_name = dynamic_vars.get("driver_name", "Unknown Driver")
                load_number = dynamic_vars.get("load_number", "Unknown Load")
                scenario = dynamic_vars.get("scenario", dynamic_vars.get("context", "Unknown"))
                
                # Map call status
                status_mapping = {
                    "registered": "pending",
                    "ongoing": "in-progress", 
                    "ended": "completed",
                    "error": "failed"
                }
                status = status_mapping.get(call_data.get("call_status", "unknown"), "unknown")
                
                # Calculate duration (timestamps are in milliseconds)
                duration_ms = call_data.get("duration_ms", 0)
                if not duration_ms and call_data.get("end_timestamp") and call_data.get("start_timestamp"):
                    duration_ms = call_data.get("end_timestamp") - call_data.get("start_timestamp")
                duration = f"{duration_ms//60000}:{(duration_ms%60000)//1000:02d}" if duration_ms > 0 else "0:00"
                
                # Get basic transcript info (full transcript loaded on detail view)
                transcript_obj = call_data.get("transcript_object") or []
                transcript_count = len(transcript_obj)
                call_analysis = call_data.get("call_analysis", {})
                
                call = Call(
                    id=call_data.get("call_id"),
                    retell_call_id=call_data.get("call_id"),
                    driver_name=driver_name,
                    phone_number=call_data.get("to_number", call_data.get("from_number", "")),
                    load_number=load_number,
                    agent_id=call_data.get("agent_id"),
                    scenario=scenario,
                    status=status,
                    duration=duration,
                    timestamp=datetime.fromtimestamp(call_data.get("start_timestamp", 0) / 1000) if call_data.get("start_timestamp") else datetime.now(),
                    outcome=call_analysis.get("call_summary", f"Call {status}"),
                    confidence=0.95 if call_analysis.get("call_successful") else 0.3,
                    extracted_data=ExtractedData(
                        current_location=dynamic_vars.get("current_location"),
                        estimated_arrival=dynamic_vars.get("estimated_arrival"), 
                        driver_status=(call_analysis.get("custom_analysis_data") or {}).get("driver_status"),
                        issues=(call_analysis.get("custom_analysis_data") or {}).get("issues"),
                        scenario_type=scenario
                    ),
                    transcript=[],  # Transcript loaded on demand via get_call
                    pickup_location=dynamic_vars.get("pickup_location"),
                    delivery_location=dynamic_vars.get("delivery_location"),
                    estimated_pickup_time=dynamic_vars.get("estimated_pickup_time"),
                    notes=dynamic_vars.get("notes")
                )
                calls.append(call)
                print(f"✅ Processed call: {driver_name} - {load_number} - {status}")
                
            print(f"🎉 Successfully converted {len(calls)} calls from Retell AI format")
            return calls
        except Exception as e:
            print(f"❌ Error listing calls: {e}")
            print(f"❌ Error type: {type(e)}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            return []
    
    async def get_call_stats(self) -> dict:
        """Get call statistics"""
        # This would typically aggregate data from your database
        # For now, return mock stats
        return {
            "total": 0,
            "completed": 0,
            "failed": 0,
            "in_progress": 0,
            "success_rate": 0,
            "avg_duration": "0:00"
        }
