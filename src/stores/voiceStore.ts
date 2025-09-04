import { create } from "zustand";
import { voiceApi } from "@/services/api";

export interface Voice {
  voice_id: string;
  voice_name: string;
  provider: string;
  accent?: string;
  gender?: string;
  age?: string;
  preview_audio_url?: string;
}

interface VoiceStore {
  voices: Voice[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null; // Timestamp of last successful fetch
  currentAudio: HTMLAudioElement | null; // Track currently playing audio
  
  // Actions
  fetchVoices: (forceRefresh?: boolean) => Promise<void>;
  ensureVoicesLoaded: () => Promise<void>;
  invalidateCache: () => void;
  getVoice: (voiceId: string) => Promise<Voice | null>;
  previewVoice: (voiceId: string) => Promise<void>;
  stopCurrentAudio: () => void;
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
const STORAGE_KEY = 'retell_voices_cache';

// Load cached data from localStorage
const loadCachedVoices = (): { voices: Voice[]; lastFetched: number } | null => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      // Check if cache is still valid (within CACHE_DURATION)
      if (Date.now() - data.lastFetched < CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.warn('Failed to load cached voices:', error);
  }
  return null;
};

// Save data to localStorage
const saveCachedVoices = (voices: Voice[], lastFetched: number) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ voices, lastFetched }));
  } catch (error) {
    console.warn('Failed to save voices to cache:', error);
  }
};

// Initialize with cached data if available
const cachedData = loadCachedVoices();

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  voices: cachedData?.voices || [],
  isLoading: false,
  error: null,
  lastFetched: cachedData?.lastFetched || null,
  currentAudio: null,

  fetchVoices: async (forceRefresh = false) => {
    const { isLoading, lastFetched } = get();
    
    // Don't fetch if already loading
    if (isLoading) return;
    
    // Check if we have fresh cache (unless forcing refresh)
    if (!forceRefresh && lastFetched && (Date.now() - lastFetched < CACHE_DURATION)) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const voices = await voiceApi.getAll();
      const timestamp = Date.now();
      
      set({ voices, isLoading: false, lastFetched: timestamp, error: null });
      
      // Save to localStorage
      saveCachedVoices(voices, timestamp);
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch voices', 
        isLoading: false 
      });
    }
  },

  ensureVoicesLoaded: async () => {
    const { lastFetched, isLoading } = get();
    
    // Only fetch if we don't have fresh data and not currently loading
    const isCacheValid = lastFetched && (Date.now() - lastFetched < CACHE_DURATION);
    if (!isCacheValid && !isLoading) {
      await get().fetchVoices();
    }
  },

  invalidateCache: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ lastFetched: null });
  },

  getVoice: async (voiceId: string) => {
    try {
      const voice = await voiceApi.getById(voiceId);
      return voice;
    } catch (error) {
      console.error(`Failed to get voice ${voiceId}:`, error);
      return null;
    }
  },

  stopCurrentAudio: () => {
    const { currentAudio } = get();
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      set({ currentAudio: null });
    }
  },

  previewVoice: async (voiceId: string) => {
    try {
      const { voices } = get();
      
      // Stop any currently playing audio
      get().stopCurrentAudio();
      
      const voice = voices.find(v => v.voice_id === voiceId);
      
      if (!voice) {
        throw new Error(`Voice "${voiceId}" not found in available voices`);
      }

      if (!voice.preview_audio_url) {
        throw new Error(`No preview audio available for "${voice.voice_name || voiceId}"`);
      }

      // Create and play the actual voice preview
      const audio = new Audio(voice.preview_audio_url);
      audio.crossOrigin = 'anonymous';
      
      // Store reference to current audio
      set({ currentAudio: audio });
      
      audio.onerror = () => {
        set({ currentAudio: null });
        throw new Error(`Failed to load preview audio for "${voice.voice_name || voiceId}"`);
      };
      
      // Clear reference when audio ends
      audio.onended = () => {
        set({ currentAudio: null });
      };
      
      await audio.play();
      
    } catch (error) {
      console.error(`Failed to preview voice ${voiceId}:`, error);
      set({ currentAudio: null });
      throw error;
    }
  }
}));
