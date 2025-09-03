from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_KEY: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Retell AI
    RETELL_API_KEY: str
    
    # Environment
    ENVIRONMENT: str = "development"
    
    # CORS
    FRONTEND_URL: str = "*"  # Allow all origins for ngrok testing
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
