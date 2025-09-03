"""
Transcript processing service for extracting structured data from call transcripts
"""
import re
from typing import Dict, Any, Optional, List
from app.models.call import DriverCheckinData, EmergencyData, ExtractedData, CallTranscriptEntry

class TranscriptProcessor:
    def __init__(self):
        # Emergency keywords for detection
        self.emergency_keywords = [
            "accident", "crash", "hit", "collision", "breakdown", "broke down", 
            "broken", "medical", "hurt", "injured", "sick", "emergency", "urgent", 
            "help", "blowout", "tire", "flat", "fire", "smoke", "stuck", "stranded"
        ]
        
        # Status keywords
        self.status_keywords = {
            "driving": ["driving", "on the road", "en route", "traveling", "moving"],
            "delayed": ["delayed", "behind", "late", "slow", "stuck", "traffic"],
            "arrived": ["arrived", "here", "at the", "made it", "reached"],
            "unloading": ["unloading", "offloading", "dumping", "door", "dock"]
        }
        
        # Location patterns
        self.location_patterns = [
            r"I-\d+",  # Interstate highways
            r"Highway \d+", r"Hwy \d+",  # Highways
            r"Mile\s*(?:Marker)?\s*\d+",  # Mile markers
            r"Exit \d+",  # Exits
            r"near\s+[\w\s]+(?:,\s*[A-Z]{2})?",  # Near locations
            r"in\s+[\w\s]+(?:,\s*[A-Z]{2})?",  # In locations
        ]

    def process_transcript(self, transcript: List[CallTranscriptEntry], scenario: str = None) -> ExtractedData:
        """
        Process call transcript and extract structured data
        """
        # Combine all text for analysis
        full_text = " ".join([entry.text for entry in transcript])
        
        # Detect if this was an emergency call
        is_emergency = self._detect_emergency(full_text)
        
        if is_emergency:
            return self._extract_emergency_data(transcript, full_text)
        else:
            return self._extract_driver_checkin_data(transcript, full_text)
    
    def _detect_emergency(self, text: str) -> bool:
        """Detect if call contains emergency content"""
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in self.emergency_keywords)
    
    def _extract_emergency_data(self, transcript: List[CallTranscriptEntry], full_text: str) -> ExtractedData:
        """Extract emergency-specific structured data"""
        
        emergency_data = EmergencyData()
        
        # Detect emergency type
        text_lower = full_text.lower()
        if any(word in text_lower for word in ["accident", "crash", "hit", "collision"]):
            emergency_data.emergency_type = "Accident"
        elif any(word in text_lower for word in ["breakdown", "broke down", "broken", "blowout", "tire"]):
            emergency_data.emergency_type = "Breakdown"
        elif any(word in text_lower for word in ["medical", "hurt", "injured", "sick"]):
            emergency_data.emergency_type = "Medical"
        else:
            emergency_data.emergency_type = "Other"
        
        # Extract safety status
        safety_phrases = [
            "everyone is safe", "we're safe", "no one hurt", "everyone's okay",
            "we're okay", "all safe", "nobody injured"
        ]
        if any(phrase in text_lower for phrase in safety_phrases):
            emergency_data.safety_status = "Driver confirmed everyone is safe"
        elif "safe" in text_lower:
            emergency_data.safety_status = "Safety status mentioned"
        
        # Extract injury status
        if any(word in text_lower for word in ["no injuries", "not hurt", "nobody hurt", "no one injured"]):
            emergency_data.injury_status = "No injuries reported"
        elif any(word in text_lower for word in ["injured", "hurt", "medical"]):
            emergency_data.injury_status = "Potential injuries - requires verification"
        
        # Extract emergency location
        emergency_data.emergency_location = self._extract_location(full_text)
        
        # Extract load security status
        if any(phrase in text_lower for phrase in ["load is secure", "cargo is safe", "everything's tied down"]):
            emergency_data.load_secure = True
        elif any(phrase in text_lower for phrase in ["load shifted", "cargo damaged", "lost some"]):
            emergency_data.load_secure = False
        
        return ExtractedData(
            emergency_data=emergency_data,
            scenario_type="emergency_protocol"
        )
    
    def _extract_driver_checkin_data(self, transcript: List[CallTranscriptEntry], full_text: str) -> ExtractedData:
        """Extract driver check-in specific structured data"""
        
        checkin_data = DriverCheckinData()
        
        # Determine call outcome based on conversation content
        text_lower = full_text.lower()
        if any(word in text_lower for word in ["arrived", "here", "at the", "unloading"]):
            checkin_data.call_outcome = "Arrival Confirmation"
        else:
            checkin_data.call_outcome = "In-Transit Update"
        
        # Extract driver status
        checkin_data.driver_status = self._extract_driver_status(full_text)
        
        # Extract location
        checkin_data.current_location = self._extract_location(full_text)
        
        # Extract ETA
        checkin_data.eta = self._extract_eta(full_text)
        
        # Extract delay reason if mentioned
        checkin_data.delay_reason = self._extract_delay_reason(full_text)
        
        # Extract unloading status if relevant
        if checkin_data.call_outcome == "Arrival Confirmation":
            checkin_data.unloading_status = self._extract_unloading_status(full_text)
        
        # Check POD reminder acknowledgment
        pod_phrases = ["pod", "proof of delivery", "paperwork", "documents"]
        if any(phrase in text_lower for phrase in pod_phrases):
            checkin_data.pod_reminder_acknowledged = True
        
        return ExtractedData(
            driver_checkin_data=checkin_data,
            scenario_type="driver_checkin",
            current_location=checkin_data.current_location,
            estimated_arrival=checkin_data.eta,
            driver_status=checkin_data.driver_status
        )
    
    def _extract_driver_status(self, text: str) -> Optional[str]:
        """Extract driver status from text"""
        text_lower = text.lower()
        
        for status, keywords in self.status_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return status.title()
        
        return None
    
    def _extract_location(self, text: str) -> Optional[str]:
        """Extract location information from text"""
        # Look for specific location patterns
        for pattern in self.location_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0]
        
        # Look for general location mentions
        location_indicators = ["at", "near", "in", "on", "by"]
        words = text.split()
        
        for i, word in enumerate(words):
            if word.lower() in location_indicators and i + 1 < len(words):
                # Extract next few words as potential location
                location_parts = words[i+1:i+4]
                location = " ".join(location_parts)
                if len(location) > 3:  # Basic validation
                    return location
        
        return None
    
    def _extract_eta(self, text: str) -> Optional[str]:
        """Extract ETA from text"""
        # Look for time patterns
        time_patterns = [
            r"\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?",  # Time format
            r"(?:in\s+)?\d+\s+(?:hours?|minutes?)",  # Duration
            r"(?:around|about|by)\s+\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?",  # Approximate times
            r"tomorrow|today|tonight",  # Relative times
        ]
        
        for pattern in time_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0]
        
        return None
    
    def _extract_delay_reason(self, text: str) -> Optional[str]:
        """Extract delay reason from text"""
        text_lower = text.lower()
        
        delay_reasons = {
            "Heavy Traffic": ["traffic", "congestion", "busy", "slow moving"],
            "Weather": ["weather", "rain", "snow", "storm", "wind", "fog"],
            "Mechanical": ["mechanical", "truck issue", "engine", "breakdown"],
            "Loading/Unloading": ["loading", "unloading", "waiting", "detention"],
            "Route Issues": ["detour", "construction", "road closed", "blocked"]
        }
        
        for reason, keywords in delay_reasons.items():
            if any(keyword in text_lower for keyword in keywords):
                return reason
        
        if any(word in text_lower for word in ["delayed", "behind", "late"]):
            return "Unspecified Delay"
        
        return "None"
    
    def _extract_unloading_status(self, text: str) -> Optional[str]:
        """Extract unloading status from text"""
        text_lower = text.lower()
        
        # Look for door numbers
        door_match = re.search(r"door\s+(\d+)", text_lower)
        if door_match:
            return f"In Door {door_match.group(1)}"
        
        # Look for other unloading statuses
        if "waiting" in text_lower and ("lumper" in text_lower or "unload" in text_lower):
            return "Waiting for Lumper"
        elif "detention" in text_lower:
            return "Detention"
        elif "unloading" in text_lower or "offloading" in text_lower:
            return "Currently Unloading"
        elif "finished" in text_lower or "done" in text_lower:
            return "Unloading Complete"
        
        return "N/A"
