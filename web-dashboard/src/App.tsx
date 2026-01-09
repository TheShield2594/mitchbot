import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from './components/layout/Navbar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { GuildLayout } from './layouts/GuildLayout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'
import GuildOverview from './pages/guild/Overview'
import Automod from './pages/guild/Automod'
import Logging from './pages/guild/Logging'
import Economy from './pages/guild/Economy'
import XP from './pages/guild/XP'
import Analytics from './pages/guild/Analytics'
import Welcome from './pages/guild/Welcome'
import Settings from './pages/guild/Settings'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          {/* Guild routes with nested layout */}
          <Route
            path="/guild/:guildId"
            element={
              <ProtectedRoute>
                <GuildLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<GuildOverview />} />
            <Route path="automod" element={<Automod />} />
            <Route path="logging" element={<Logging />} />
            <Route path="economy" element={<Economy />} />
            <Route path="xp" element={<XP />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="welcome" element={<Welcome />} />
            <Route path="settings" element={<Settings />} />
            {/* Add more guild routes here as needed */}
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
