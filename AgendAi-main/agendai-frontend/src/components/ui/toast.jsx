import { useEffect } from 'react'
import { Card } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
}

const toastStyles = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800'
}

export function Toast({ toast, onRemove }) {
  const Icon = toastIcons[toast.type]
  const styleClass = toastStyles[toast.type]

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, 5000)

    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  return (
    <Card className={`p-4 shadow-lg border-l-4 ${styleClass} animate-in slide-in-from-right duration-300`}>
      <div className="flex items-start space-x-3">
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(toast.id)}
          className="h-6 w-6 p-0 hover:bg-transparent"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}

export function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

