import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog.jsx'
import { Scissors, Plus, Edit, Trash2, Clock, DollarSign, Loader2 } from 'lucide-react'
import { useAPI, useToast } from '@/hooks/useAPI.js'
import { servicesAPI } from '@/lib/api.js'

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    duration_minutes: '',
    price: '',
    description: ''
  })
  const [errors, setErrors] = useState({})

  const { loading, execute } = useAPI()
  const { success, error: showError } = useToast()

  // Carregar serviços ao montar o componente
  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    try {
      const response = await execute(() => servicesAPI.getAll())
      if (response.success) {
        setServices(response.data)
      }
    } catch (err) {
      showError('Erro ao carregar serviços: ' + err.message)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name?.trim()) {
      newErrors.name = 'Nome do serviço é obrigatório'
    }

    if (!formData.duration_minutes) {
      newErrors.duration_minutes = 'Duração é obrigatória'
    } else if (isNaN(formData.duration_minutes) || parseInt(formData.duration_minutes) <= 0) {
      newErrors.duration_minutes = 'Duração deve ser um número maior que zero'
    }

    if (!formData.price) {
      newErrors.price = 'Preço é obrigatório'
    } else if (isNaN(formData.price) || parseFloat(formData.price) < 0) {
      newErrors.price = 'Preço deve ser um número válido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const openCreateModal = () => {
    setEditingService(null)
    setFormData({
      name: '',
      duration_minutes: '',
      price: '',
      description: ''
    })
    setErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      duration_minutes: service.duration_minutes.toString(),
      price: service.price.toString(),
      description: service.description || ''
    })
    setErrors({})
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      showError('Por favor, corrija os erros no formulário')
      return
    }

    try {
      const serviceData = {
        name: formData.name.trim(),
        duration_minutes: parseInt(formData.duration_minutes),
        price: parseFloat(formData.price),
        description: formData.description.trim()
      }

      let response
      if (editingService) {
        response = await execute(() => servicesAPI.update(editingService.id, serviceData))
      } else {
        response = await execute(() => servicesAPI.create(serviceData))
      }

      if (response.success) {
        success(editingService ? 'Serviço atualizado com sucesso!' : 'Serviço criado com sucesso!')
        setIsModalOpen(false)
        loadServices()
      }
    } catch (err) {
      showError('Erro ao salvar serviço: ' + err.message)
    }
  }

  const handleDelete = async (serviceId) => {
    try {
      const response = await execute(() => servicesAPI.delete(serviceId))
      if (response.success) {
        success('Serviço excluído com sucesso!')
        loadServices()
      }
    } catch (err) {
      showError('Erro ao excluir serviço: ' + err.message)
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Scissors className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold text-foreground">Serviços</h2>
        </div>
        <Button onClick={openCreateModal} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Novo Serviço</span>
        </Button>
      </div>

      {/* Lista de Serviços */}
      {loading && services.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Carregando serviços...</span>
          </CardContent>
        </Card>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Scissors className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum serviço cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Comece criando seu primeiro serviço para oferecer aos seus clientes.
            </p>
            <Button onClick={openCreateModal} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Criar Primeiro Serviço</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(service)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Serviço</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o serviço "{service.name}"? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(service.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(service.duration_minutes)}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-600">
                    {formatPrice(service.price)}
                  </span>
                </div>
                {service.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {service.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal para Criar/Editar Serviço */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Editar Serviço' : 'Novo Serviço'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Serviço *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Limpeza de pele"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration_minutes">Duração (min) *</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  min="1"
                  value={formData.duration_minutes}
                  onChange={(e) => handleInputChange('duration_minutes', e.target.value)}
                  placeholder="60"
                  className={errors.duration_minutes ? 'border-destructive' : ''}
                />
                {errors.duration_minutes && (
                  <p className="text-sm text-destructive">{errors.duration_minutes}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="150.00"
                  className={errors.price ? 'border-destructive' : ''}
                />
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descrição detalhada do serviço..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {editingService ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

