// Utility functions for localStorage management

/**
 * Clear all Retell-related data from localStorage
 * This can be called manually from browser console if needed
 */
export const clearRetellLocalStorage = (): void => {
  try {
    const keysToRemove: string[] = [];
    
    // Find all keys that might contain Retell data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('call') || 
        key.includes('retell') || 
        key.includes('agent') ||
        key === 'call-store' ||
        key === 'agent-store'
      )) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all identified keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Cleared ${key} from localStorage`);
    });
    
    if (keysToRemove.length > 0) {
      console.log(`✅ Cleared ${keysToRemove.length} localStorage keys`);
    } else {
      console.log('✅ No Retell localStorage data found to clear');
    }
    
  } catch (error) {
    console.error('❌ Failed to clear localStorage:', error);
  }
};

/**
 * Expose function globally for debugging
 * Can be called from browser console: window.clearRetellData()
 */
if (typeof window !== 'undefined') {
  (window as any).clearRetellData = clearRetellLocalStorage;
}
