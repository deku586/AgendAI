from flask import Blueprint, request, jsonify
from src.models.agendai import db, Service

services_bp = Blueprint('services', __name__)

@services_bp.route('/services', methods=['GET'])
def get_services():
    """Listar todos os serviços"""
    try:
        services = Service.query.order_by(Service.created_at.desc()).all()
        return jsonify({
            'success': True,
            'data': [service.to_dict() for service in services]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@services_bp.route('/services', methods=['POST'])
def create_service():
    """Criar novo serviço"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados não fornecidos'
            }), 400
        
        # Validações
        required_fields = ['name', 'duration_minutes', 'price']
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({
                    'success': False,
                    'error': f'Campo {field} é obrigatório'
                }), 400
        
        # Validar tipos
        try:
            duration_minutes = int(data['duration_minutes'])
            price = float(data['price'])
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'error': 'Duração deve ser um número inteiro e preço deve ser um número'
            }), 400
        
        if duration_minutes <= 0:
            return jsonify({
                'success': False,
                'error': 'Duração deve ser maior que zero'
            }), 400
        
        if price < 0:
            return jsonify({
                'success': False,
                'error': 'Preço não pode ser negativo'
            }), 400
        
        service = Service(
            name=data['name'].strip(),
            duration_minutes=duration_minutes,
            price=price,
            description=data.get('description', '').strip()
        )
        
        db.session.add(service)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Serviço criado com sucesso',
            'data': service.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@services_bp.route('/services/<int:service_id>', methods=['GET'])
def get_service(service_id):
    """Buscar serviço específico"""
    try:
        service = Service.query.get(service_id)
        if not service:
            return jsonify({
                'success': False,
                'error': 'Serviço não encontrado'
            }), 404
        
        return jsonify({
            'success': True,
            'data': service.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@services_bp.route('/services/<int:service_id>', methods=['PUT'])
def update_service(service_id):
    """Atualizar serviço"""
    try:
        service = Service.query.get(service_id)
        if not service:
            return jsonify({
                'success': False,
                'error': 'Serviço não encontrado'
            }), 404
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados não fornecidos'
            }), 400
        
        # Validações
        if 'name' in data and not data['name'].strip():
            return jsonify({
                'success': False,
                'error': 'Nome do serviço é obrigatório'
            }), 400
        
        if 'duration_minutes' in data:
            try:
                duration_minutes = int(data['duration_minutes'])
                if duration_minutes <= 0:
                    return jsonify({
                        'success': False,
                        'error': 'Duração deve ser maior que zero'
                    }), 400
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'error': 'Duração deve ser um número inteiro'
                }), 400
        
        if 'price' in data:
            try:
                price = float(data['price'])
                if price < 0:
                    return jsonify({
                        'success': False,
                        'error': 'Preço não pode ser negativo'
                    }), 400
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'error': 'Preço deve ser um número'
                }), 400
        
        # Atualizar campos
        if 'name' in data:
            service.name = data['name'].strip()
        if 'duration_minutes' in data:
            service.duration_minutes = int(data['duration_minutes'])
        if 'price' in data:
            service.price = float(data['price'])
        if 'description' in data:
            service.description = data['description'].strip()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Serviço atualizado com sucesso',
            'data': service.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@services_bp.route('/services/<int:service_id>', methods=['DELETE'])
def delete_service(service_id):
    """Excluir serviço"""
    try:
        service = Service.query.get(service_id)
        if not service:
            return jsonify({
                'success': False,
                'error': 'Serviço não encontrado'
            }), 404
        
        # Verificar se há agendamentos associados
        if service.bookings:
            return jsonify({
                'success': False,
                'error': 'Não é possível excluir serviço com agendamentos associados'
            }), 400
        
        db.session.delete(service)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Serviço excluído com sucesso'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

