import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog.jsx'
import { Calendar, Plus, Clock, User, Phone, Mail, Edit, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAPI, useToast } from '@/hooks/useAPI.js'
import { bookingsAPI, servicesAPI } from '@/lib/api.js'

export default function BookingsPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [bookings, setBookings] = useState([])
  const [services, setServices] = useState([])
  const [dayBookings, setDayBookings] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState(null)
  const [formData, setFormData] = useState({
    service_id: '',
    date: '',
    time: '',
    client_name: '',
    client_contact: ''
  })
  const [errors, setErrors] = useState({})
  const [availableSlots, setAvailableSlots] = useState([])

  const { loading, execute } = useAPI()
  const { success, error: showError } = useToast()

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadBookings()
    loadServices()
  }, [])

  // Carregar agendamentos do mês atual
  useEffect(() => {
    loadBookings()
  }, [currentDate])

  // Carregar agendamentos do dia selecionado
  useEffect(() => {
    if (selectedDate) {
      loadDayBookings(selectedDate)
    }
  }, [selectedDate, bookings])

  const loadBookings = async () => {
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const response = await execute(() => bookingsAPI.getByMonth(year, month))
      if (response.success) {
        setBookings(response.data)
      }
    } catch (err) {
      showError('Erro ao carregar agendamentos: ' + err.message)
    }
  }

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

  const loadDayBookings = (date) => {
    const dateStr = formatDateForAPI(date)
    const dayBookings = bookings.filter(booking => 
      booking.date === dateStr
    ).sort((a, b) => a.time.localeCompare(b.time))
    setDayBookings(dayBookings)
  }

  const loadAvailableSlots = async (serviceId, date) => {
    try {
      const dateStr = formatDateForAPI(date)
      const response = await execute(() => bookingsAPI.getAvailableTimes(dateStr, serviceId))
      if (response.success) {
        setAvailableSlots(response.data)
      }
    } catch (err) {
      showError('Erro ao carregar horários disponíveis: ' + err.message)
      setAvailableSlots([])
    }
  }

  const formatDateForAPI = (date) => {
    return date.toISOString().split('T')[0]
  }

  const formatDateForDisplay = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    })
  }

  const formatTime = (timeStr) => {
    return timeStr.slice(0, 5)
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.service_id) {
      newErrors.service_id = 'Serviço é obrigatório'
    }

    if (!formData.date) {
      newErrors.date = 'Data é obrigatória'
    }

    if (!formData.time) {
      newErrors.time = 'Horário é obrigatório'
    }

    if (!formData.client_name?.trim()) {
      newErrors.client_name = 'Nome do cliente é obrigatório'
    }

    if (!formData.client_contact?.trim()) {
      newErrors.client_contact = 'Contato do cliente é obrigatório'
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

    // Carregar horários disponíveis quando serviço e data forem selecionados
    if (field === 'service_id' || field === 'date') {
      const serviceId = field === 'service_id' ? value : formData.service_id
      const date = field === 'date' ? new Date(value) : (formData.date ? new Date(formData.date) : null)
      
      if (serviceId && date) {
        loadAvailableSlots(serviceId, date)
      }
    }
  }

  const openCreateModal = (date = null) => {
    setEditingBooking(null)
    setFormData({
      service_id: '',
      date: date ? formatDateForAPI(date) : '',
      time: '',
      client_name: '',
      client_contact: ''
    })
    setErrors({})
    setAvailableSlots([])
    setIsModalOpen(true)
  }

  const openEditModal = (booking) => {
    setEditingBooking(booking)
    setFormData({
      service_id: booking.service_id.toString(),
      date: booking.date,
      time: booking.time,
      client_name: booking.client_name,
      client_contact: booking.client_contact
    })
    setErrors({})
    loadAvailableSlots(booking.service_id, new Date(booking.date + 'T00:00:00'))
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      showError('Por favor, corrija os erros no formulário')
      return
    }

    try {
      const bookingData = {
        service_id: parseInt(formData.service_id),
        date: formData.date,
        time: formData.time,
        client_name: formData.client_name.trim(),
        client_contact: formData.client_contact.trim()
      }

      let response
      if (editingBooking) {
        response = await execute(() => bookingsAPI.update(editingBooking.id, bookingData))
      } else {
        response = await execute(() => bookingsAPI.create(bookingData))
      }

      if (response.success) {
        success(editingBooking ? 'Agendamento atualizado com sucesso!' : 'Agendamento criado com sucesso!')
        setIsModalOpen(false)
        loadBookings()
      }
    } catch (err) {
      showError('Erro ao salvar agendamento: ' + err.message)
    }
  }

  const handleDelete = async (bookingId) => {
    try {
      const response = await execute(() => bookingsAPI.delete(bookingId))
      if (response.success) {
        success('Agendamento cancelado com sucesso!')
        loadBookings()
      }
    } catch (err) {
      showError('Erro ao cancelar agendamento: ' + err.message)
    }
  }

  const getServiceName = (serviceId) => {
    const service = services.find(s => s.id === serviceId)
    return service ? service.name : 'Serviço não encontrado'
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Adicionar dias vazios do início
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Adicionar dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const hasBookingsOnDate = (date) => {
    if (!date) return false
    const dateStr = formatDateForAPI(date)
    return bookings.some(booking => booking.date === dateStr)
  }

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
    setSelectedDate(null)
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold text-foreground">Agenda</h2>
        </div>
        <Button onClick={() => openCreateModal()} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Novo Agendamento</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth(-1)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth(1)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentDate).map((date, index) => (
                  <button
                    key={index}
                    onClick={() => date && setSelectedDate(date)}
                    disabled={!date}
                    className={`
                      p-2 text-sm rounded-md transition-colors relative
                      ${!date ? 'invisible' : ''}
                      ${selectedDate && date && formatDateForAPI(selectedDate) === formatDateForAPI(date)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                      }
                      ${hasBookingsOnDate(date) ? 'font-semibold' : ''}
                    `}
                  >
                    {date && (
                      <>
                        {date.getDate()}
                        {hasBookingsOnDate(date) && (
                          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                        )}
                      </>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agendamentos do Dia */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedDate ? formatDateForDisplay(formatDateForAPI(selectedDate)) : 'Selecione um dia'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-muted-foreground text-center py-4">
                  Clique em um dia no calendário para ver os agendamentos
                </p>
              ) : dayBookings.length === 0 ? (
                <div className="text-center py-4">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-3">Nenhum agendamento para este dia</p>
                  <Button 
                    size="sm" 
                    onClick={() => openCreateModal(selectedDate)}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Agendar</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {dayBookings.map((booking) => (
                    <div key={booking.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{formatTime(booking.time)}</span>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(booking)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja cancelar o agendamento de {booking.client_name}? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Manter</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(booking.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Cancelar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center space-x-2">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span>{booking.client_name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span>{booking.client_contact}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getServiceName(booking.service_id)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openCreateModal(selectedDate)}
                    className="w-full flex items-center space-x-2"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Novo Agendamento</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal para Criar/Editar Agendamento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBooking ? 'Editar Agendamento' : 'Novo Agendamento'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service_id">Serviço *</Label>
              <Select
                value={formData.service_id}
                onValueChange={(value) => handleInputChange('service_id', value)}
              >
                <SelectTrigger className={errors.service_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name} - {service.duration_minutes}min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.service_id && (
                <p className="text-sm text-destructive">{errors.service_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={errors.date ? 'border-destructive' : ''}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Horário *</Label>
              <Select
                value={formData.time}
                onValueChange={(value) => handleInputChange('time', value)}
                disabled={!formData.service_id || !formData.date}
              >
                <SelectTrigger className={errors.time ? 'border-destructive' : ''}>
                  <SelectValue placeholder={
                    !formData.service_id || !formData.date 
                      ? "Selecione serviço e data primeiro"
                      : availableSlots.length === 0
                      ? "Nenhum horário disponível"
                      : "Selecione um horário"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {formatTime(slot)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.time && (
                <p className="text-sm text-destructive">{errors.time}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_name">Nome do Cliente *</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => handleInputChange('client_name', e.target.value)}
                placeholder="Nome completo do cliente"
                className={errors.client_name ? 'border-destructive' : ''}
              />
              {errors.client_name && (
                <p className="text-sm text-destructive">{errors.client_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_contact">Contato *</Label>
              <Input
                id="client_contact"
                value={formData.client_contact}
                onChange={(e) => handleInputChange('client_contact', e.target.value)}
                placeholder="Telefone ou e-mail"
                className={errors.client_contact ? 'border-destructive' : ''}
              />
              {errors.client_contact && (
                <p className="text-sm text-destructive">{errors.client_contact}</p>
              )}
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
                {editingBooking ? 'Atualizar' : 'Agendar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

