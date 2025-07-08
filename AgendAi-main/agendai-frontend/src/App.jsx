import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { User, Calendar, Scissors, Menu, X } from 'lucide-react'
import { ToastContainer } from '@/components/ui/toast.jsx'
import { useToast } from '@/hooks/useAPI.js'
import './App.css'

// Componentes das páginas (serão implementados nas próximas fases)
import ProfilePage from './components/ProfilePage'
import ServicesPage from './components/ServicesPage'
import BookingsPage from './components/BookingsPage'

function App() {
  const [activeTab, setActiveTab] = useState('bookings')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { toasts, removeToast } = useToast()

  const tabs = [
    { id: 'bookings', label: 'Agenda', icon: Calendar },
    { id: 'services', label: 'Serviços', icon: Scissors },
    { id: 'profile', label: 'Perfil', icon: User }
  ]

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">AgendAI</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center space-x-2 px-4 py-2"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </Button>
                )
              })}
            </nav>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border bg-white">
              <nav className="py-2 space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? "default" : "ghost"}
                      onClick={() => {
                        setActiveTab(tab.id)
                        setMobileMenuOpen(false)
                      }}
                      className="w-full justify-start flex items-center space-x-2 px-4 py-2"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </Button>
                  )
                })}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Page Content */}
          {activeTab === 'profile' && <ProfilePage />}
          {activeTab === 'services' && <ServicesPage />}
          {activeTab === 'bookings' && <BookingsPage />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2024 AgendAI - Sistema de Agendamento para Clínica Estética</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

