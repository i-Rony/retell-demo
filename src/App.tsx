import { useEffect } from 'react'
import Layout from './components/layout/Layout'
import AgentConfig from './pages/AgentConfig'
import CallTrigger from './pages/CallTrigger'
import CallResults from './pages/CallResults'
import { useUIStore, uiSelectors } from './stores/uiStore'

function App() {
  const currentPage = useUIStore(uiSelectors.currentPage);
  const { setCurrentPage } = useUIStore();

  useEffect(() => {
    const storedTheme = localStorage.getItem('ai-voice-agent-theme') as 'light' | 'dark' | 'system' || 'system';
    useUIStore.getState().setTheme(storedTheme);
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
