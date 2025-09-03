import { useEffect } from 'react'
import Layout from './components/layout/Layout'
import AgentConfig from './pages/AgentConfig'
import CallTrigger from './pages/CallTrigger'
import CallResults from './pages/CallResults'
import { useUIStore, uiSelectors } from './stores/uiStore'
import { clearRetellLocalStorage } from './utils/localStorage'

function App() {
  const currentPage = useUIStore(uiSelectors.currentPage);
  const { setCurrentPage } = useUIStore();

  // Initialize the UI store theme and clear old call/agent data on app load
  useEffect(() => {
    // Initialize theme (keep this)
    const storedTheme = localStorage.getItem('ai-voice-agent-theme') as 'light' | 'dark' | 'system' || 'system';
    useUIStore.getState().setTheme(storedTheme);
    
    // Clear old call/agent localStorage data (we now use API)
    console.log('🗑️ App: Clearing old localStorage data, now using live API data');
    clearRetellLocalStorage();
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'config':
        return <AgentConfig />
      case 'trigger':
        return <CallTrigger />
      case 'results':
        return <CallResults />
      default:
        return <AgentConfig />
    }
  }

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  )
}

export default App
