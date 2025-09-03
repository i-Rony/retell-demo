// Export all stores
export * from './agentStore'
export * from './callStore'
export * from './uiStore'

// Combined selectors for convenience
export const useStores = () => {
  return {
    agent: require('./agentStore').useAgentStore,
    call: require('./callStore').useCallStore,
    ui: require('./uiStore').useUIStore,
  }
}
