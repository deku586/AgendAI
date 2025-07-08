import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx'
import { User, Camera, Save, Loader2 } from 'lucide-react'
import { useAPI, useToast } from '@/hooks/useAPI.js'
import { profileAPI } from '@/lib/api.js'

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    full_name: '',
    clinic_name: '',
    email: '',
    phone: '',
    avatar_url: null
  })
  const [formData, setFormData] = useState({})
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [errors, setErrors] = useState({})

  const { loading, execute } = useAPI()
  const { success, error: showError } = useToast()

  // Carregar dados do perfil ao montar o componente
  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await execute(() => profileAPI.get())
      if (response.success) {
        setProfile(response.data)
        setFormData(response.data)
      }
    } catch (err) {
      showError('Erro ao carregar perfil: ' + err.message)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.full_name?.trim()) {
      newErrors.full_name = 'Nome completo é obrigatório'
    }

    if (!formData.clinic_name?.trim()) {
      newErrors.clinic_name = 'Nome da clínica é obrigatório'
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'E-mail é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido'
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'Telefone é obrigatório'
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

  const handleAvatarChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        showError('Por favor, selecione um arquivo de imagem')
        return
      }

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('A imagem deve ter no máximo 5MB')
        return
      }

      setAvatarFile(file)
      
      // Criar preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async () => {
    if (!avatarFile) return

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('avatar', avatarFile)

      const response = await execute(() => profileAPI.uploadAvatar(formDataUpload))
      if (response.success) {
        setProfile(prev => ({ ...prev, avatar_url: response.avatar_url }))
        setAvatarFile(null)
        setAvatarPreview(null)
        success('Avatar atualizado com sucesso!')
      }
    } catch (err) {
      showError('Erro ao fazer upload do avatar: ' + err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      showError('Por favor, corrija os erros no formulário')
      return
    }

    try {
      // Upload do avatar primeiro, se houver
      if (avatarFile) {
        await uploadAvatar()
      }

      // Atualizar dados do perfil
      const response = await execute(() => profileAPI.update(formData))
      if (response.success) {
        setProfile(response.data)
        success('Perfil atualizado com sucesso!')
      }
    } catch (err) {
      showError('Erro ao salvar perfil: ' + err.message)
    }
  }

  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview
    if (profile.avatar_url) return profile.avatar_url
    return null
  }

  const getInitials = () => {
    const name = profile.full_name || formData.full_name || 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <User className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-semibold text-foreground">Perfil</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Profissional</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={getAvatarUrl()} alt="Avatar" />
                <AvatarFallback className="text-lg font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex flex-col items-center space-y-2">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="flex items-center space-x-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors">
                    <Camera className="w-4 h-4" />
                    <span>Alterar Foto</span>
                  </div>
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                {avatarFile && (
                  <p className="text-sm text-muted-foreground">
                    {avatarFile.name}
                  </p>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name || ''}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Seu nome completo"
                  className={errors.full_name ? 'border-destructive' : ''}
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive">{errors.full_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic_name">Nome da Clínica *</Label>
                <Input
                  id="clinic_name"
                  value={formData.clinic_name || ''}
                  onChange={(e) => handleInputChange('clinic_name', e.target.value)}
                  placeholder="Nome da sua clínica"
                  className={errors.clinic_name ? 'border-destructive' : ''}
                />
                {errors.clinic_name && (
                  <p className="text-sm text-destructive">{errors.clinic_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="seu@email.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={loading} className="flex items-center space-x-2">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Salvar Alterações</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

