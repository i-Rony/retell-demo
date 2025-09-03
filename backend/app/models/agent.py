from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

class ResponseEngine(BaseModel):
    type: str
    llm_id: Optional[str] = None
    version: Optional[int] = None
    llm_websocket_url: Optional[str] = None
    conversation_flow_id: Optional[str] = None

class VoicemailAction(BaseModel):
    type: str
    text: Optional[str] = None

class VoicemailOption(BaseModel):
    action: VoicemailAction

class UserDtmfOptions(BaseModel):
    digit_limit: Optional[int] = None
    termination_key: Optional[str] = None
    timeout_ms: Optional[int] = None

class PronunciationEntry(BaseModel):
    word: str
    alphabet: str
    phoneme: str

class PIIConfig(BaseModel):
    mode: str
    categories: List[str] = []

class PostCallAnalysisData(BaseModel):
    type: str
    name: str
    description: str
    examples: Optional[List[str]] = None
    choices: Optional[List[str]] = None

class AgentBase(BaseModel):
    # Basic agent info
    agent_name: Optional[str] = None
    description: Optional[str] = None
    prompt: Optional[str] = None  # General prompt for the agent
    
    # Response engine configuration
    response_engine: Optional[ResponseEngine] = None
    
    # Voice configuration
    voice_id: str = "alloy"
    voice_model: Optional[str] = None
    fallback_voice_ids: Optional[List[str]] = None
    voice_temperature: Optional[float] = None
    voice_speed: Optional[float] = None
    volume: Optional[float] = None
    
    # Interaction settings
    responsiveness: Optional[float] = None
    interruption_sensitivity: Optional[float] = None
    enable_backchannel: Optional[bool] = None
    backchannel_frequency: Optional[float] = None
    backchannel_words: Optional[List[str]] = None
    
    # Timing and behavior
    reminder_trigger_ms: Optional[int] = None
    reminder_max_count: Optional[int] = None
    begin_message_delay_ms: Optional[int] = None
    ring_duration_ms: Optional[int] = None
    end_call_after_silence_ms: Optional[int] = None
    max_call_duration_ms: Optional[int] = None
    
    # Audio and environment
    ambient_sound: Optional[str] = None
    ambient_sound_volume: Optional[float] = None
    normalize_for_speech: Optional[bool] = None
    
    # Language and transcription
    language: Optional[str] = None
    stt_mode: Optional[str] = None
    vocab_specialization: Optional[str] = None
    denoising_mode: Optional[str] = None
    
    # Keywords and pronunciation
    boosted_keywords: Optional[List[str]] = None
    pronunciation_dictionary: Optional[List[PronunciationEntry]] = None
    
    # Integration settings
    webhook_url: Optional[str] = None
    data_storage_setting: Optional[str] = None
    opt_in_signed_url: Optional[bool] = None
    
    # DTMF settings
    allow_user_dtmf: Optional[bool] = None
    user_dtmf_options: Optional[UserDtmfOptions] = None
    
    # Voicemail settings
    voicemail_option: Optional[VoicemailOption] = None
    
    # Post-call analysis
    post_call_analysis_data: Optional[List[PostCallAnalysisData]] = None
    post_call_analysis_model: Optional[str] = None
    
    # PII configuration
    pii_config: Optional[PIIConfig] = None

class AgentCreate(AgentBase):
    pass

class AgentUpdate(BaseModel):
    # Basic agent info  
    agent_name: Optional[str] = None
    description: Optional[str] = None
    prompt: Optional[str] = None  # General prompt for the agent
    
    # Voice configuration
    voice_id: Optional[str] = None
    voice_model: Optional[str] = None
    fallback_voice_ids: Optional[List[str]] = None
    voice_temperature: Optional[float] = None
    voice_speed: Optional[float] = None
    volume: Optional[float] = None
    
    # Interaction settings
    responsiveness: Optional[float] = None
    interruption_sensitivity: Optional[float] = None
    enable_backchannel: Optional[bool] = None
    backchannel_frequency: Optional[float] = None
    backchannel_words: Optional[List[str]] = None
    
    # Timing and behavior
    reminder_trigger_ms: Optional[int] = None
    reminder_max_count: Optional[int] = None
    begin_message_delay_ms: Optional[int] = None
    ring_duration_ms: Optional[int] = None
    end_call_after_silence_ms: Optional[int] = None
    max_call_duration_ms: Optional[int] = None
    
    # Audio and environment
    ambient_sound: Optional[str] = None
    ambient_sound_volume: Optional[float] = None
    normalize_for_speech: Optional[bool] = None
    
    # Language and transcription
    language: Optional[str] = None
    stt_mode: Optional[str] = None
    vocab_specialization: Optional[str] = None
    denoising_mode: Optional[str] = None
    
    # Keywords and pronunciation
    boosted_keywords: Optional[List[str]] = None
    pronunciation_dictionary: Optional[List[PronunciationEntry]] = None
    
    # Integration settings
    webhook_url: Optional[str] = None
    data_storage_setting: Optional[str] = None
    opt_in_signed_url: Optional[bool] = None
    
    # DTMF settings
    allow_user_dtmf: Optional[bool] = None
    user_dtmf_options: Optional[UserDtmfOptions] = None
    
    # Voicemail settings
    voicemail_option: Optional[VoicemailOption] = None
    
    # Post-call analysis
    post_call_analysis_data: Optional[List[PostCallAnalysisData]] = None
    post_call_analysis_model: Optional[str] = None
    
    # PII configuration
    pii_config: Optional[PIIConfig] = None

class Agent(AgentBase):
    # Core identifiers
    id: str  # Our internal ID (same as agent_id from Retell)
    agent_id: str  # Retell agent ID
    version: Optional[int] = None
    is_published: Optional[bool] = None
    
    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_modification_timestamp: Optional[int] = None
    
    # Stats (computed fields)
    calls_today: int = 0

    class Config:
        from_attributes = True
