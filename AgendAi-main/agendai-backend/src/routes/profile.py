from flask import Blueprint, request, jsonify
from src.models.agendai import db, Profile
import os
from werkzeug.utils import secure_filename

profile_bp = Blueprint('profile', __name__)

UPLOAD_FOLDER = 'src/static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@profile_bp.route('/profile', methods=['GET'])
def get_profile():
    """Buscar dados do perfil"""
    try:
        profile = Profile.query.first()
        if not profile:
            # Criar perfil padrão se não existir
            profile = Profile(
                full_name='',
                clinic_name='',
                email='',
                phone='',
                avatar_url=None
            )
            db.session.add(profile)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'data': profile.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@profile_bp.route('/profile', methods=['PUT'])
def update_profile():
    """Atualizar perfil"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados não fornecidos'
            }), 400
        
        # Validações básicas
        required_fields = ['full_name', 'clinic_name', 'email', 'phone']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Campo {field} é obrigatório'
                }), 400
        
        profile = Profile.query.first()
        if not profile:
            profile = Profile()
            db.session.add(profile)
        
        profile.full_name = data['full_name']
        profile.clinic_name = data['clinic_name']
        profile.email = data['email']
        profile.phone = data['phone']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Perfil atualizado com sucesso',
            'data': profile.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@profile_bp.route('/profile/avatar', methods=['POST'])
def upload_avatar():
    """Upload de avatar"""
    try:
        if 'avatar' not in request.files:
            return jsonify({
                'success': False,
                'error': 'Nenhum arquivo enviado'
            }), 400
        
        file = request.files['avatar']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'Nenhum arquivo selecionado'
            }), 400
        
        if file and allowed_file(file.filename):
            # Criar diretório de upload se não existir
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            
            filename = secure_filename(file.filename)
            # Adicionar timestamp para evitar conflitos
            import time
            timestamp = str(int(time.time()))
            name, ext = os.path.splitext(filename)
            filename = f"{name}_{timestamp}{ext}"
            
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            file.save(file_path)
            
            # Atualizar perfil com URL do avatar
            profile = Profile.query.first()
            if not profile:
                profile = Profile(
                    full_name='',
                    clinic_name='',
                    email='',
                    phone=''
                )
                db.session.add(profile)
            
            profile.avatar_url = f'/uploads/{filename}'
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Avatar atualizado com sucesso',
                'avatar_url': profile.avatar_url
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Tipo de arquivo não permitido'
            }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

