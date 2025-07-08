import { useState, useCallback } from 'react'

export function useAPI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = useCallback(async (apiCall) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiCall()
      return response.data
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Erro desconhecido'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, execute, setError }
}

// Hook específico para toast notifications
export function useToast() {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    const toast = { id, message, type }
    
    setToasts(prev => [...prev, toast])
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((message) => showToast(message, 'success'), [showToast])
  const error = useCallback((message) => showToast(message, 'error'), [showToast])
  const warning = useCallback((message) => showToast(message, 'warning'), [showToast])
  const info = useCallback((message) => showToast(message, 'info'), [showToast])

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info
  }
}

