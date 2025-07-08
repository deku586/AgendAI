from flask import Blueprint, request, jsonify
from src.models.agendai import db, Booking, Service
from datetime import datetime, date, time, timedelta
from sqlalchemy import and_, or_

bookings_bp = Blueprint('bookings', __name__)

@bookings_bp.route('/bookings', methods=['GET'])
def get_bookings():
    """Listar todos os agendamentos"""
    try:
        # Parâmetros opcionais para filtrar
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        status = request.args.get('status')
        
        query = Booking.query
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(Booking.appointment_date >= start_date_obj)
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Formato de data inválido para start_date (use YYYY-MM-DD)'
                }), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(Booking.appointment_date <= end_date_obj)
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Formato de data inválido para end_date (use YYYY-MM-DD)'
                }), 400
        
        if status:
            query = query.filter(Booking.status == status)
        
        bookings = query.order_by(Booking.appointment_date.desc(), Booking.appointment_time.desc()).all()
        
        return jsonify({
            'success': True,
            'data': [booking.to_dict() for booking in bookings]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bookings_bp.route('/bookings/calendar/<int:month>/<int:year>', methods=['GET'])
def get_calendar_bookings(month, year):
    """Buscar agendamentos do mês para o calendário"""
    try:
        # Validar mês e ano
        if month < 1 or month > 12:
            return jsonify({
                'success': False,
                'error': 'Mês deve estar entre 1 e 12'
            }), 400
        
        if year < 2020 or year > 2030:
            return jsonify({
                'success': False,
                'error': 'Ano deve estar entre 2020 e 2030'
            }), 400
        
        # Criar datas de início e fim do mês
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)
        
        bookings = Booking.query.filter(
            and_(
                Booking.appointment_date >= start_date,
                Booking.appointment_date <= end_date,
                Booking.status != 'cancelled'
            )
        ).order_by(Booking.appointment_date, Booking.appointment_time).all()
        
        # Agrupar por data
        calendar_data = {}
        for booking in bookings:
            date_str = booking.appointment_date.isoformat()
            if date_str not in calendar_data:
                calendar_data[date_str] = []
            calendar_data[date_str].append(booking.to_dict())
        
        return jsonify({
            'success': True,
            'data': calendar_data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bookings_bp.route('/bookings/available-times/<date_str>/<int:service_id>', methods=['GET'])
def get_available_times(date_str, service_id):
    """Buscar horários disponíveis para uma data e serviço"""
    try:
        # Validar data
        try:
            appointment_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'Formato de data inválido (use YYYY-MM-DD)'
            }), 400
        
        # Verificar se a data não é no passado (comentado para testes)
        # if appointment_date < date.today():
        #     return jsonify({
        #         'success': False,
        #         'error': 'Não é possível agendar para datas passadas'
        #     }), 400
        
        # Verificar se o serviço existe
        service = Service.query.get(service_id)
        if not service:
            return jsonify({
                'success': False,
                'error': 'Serviço não encontrado'
            }), 404
        
        # Horários de funcionamento (8h às 18h)
        start_hour = 8
        end_hour = 18
        
        # Buscar agendamentos existentes para a data
        existing_bookings = Booking.query.filter(
            and_(
                Booking.appointment_date == appointment_date,
                Booking.status != 'cancelled'
            )
        ).all()
        
        # Gerar todos os horários possíveis (intervalos de 30 minutos)
        available_times = []
        current_time = time(start_hour, 0)
        end_time = time(end_hour, 0)
        
        while current_time < end_time:
            # Verificar se o horário + duração do serviço não ultrapassa o horário de funcionamento
            current_datetime = datetime.combine(appointment_date, current_time)
            end_datetime = current_datetime + timedelta(minutes=service.duration_minutes)
            
            if end_datetime.time() <= end_time:
                # Verificar se não há conflito com agendamentos existentes
                has_conflict = False
                for booking in existing_bookings:
                    booking_start = datetime.combine(appointment_date, booking.appointment_time)
                    booking_end = booking_start + timedelta(minutes=booking.service.duration_minutes)
                    
                    # Verificar sobreposição
                    if (current_datetime < booking_end and end_datetime > booking_start):
                        has_conflict = True
                        break
                
                if not has_conflict:
                    available_times.append(current_time.strftime('%H:%M'))
            
            # Próximo horário (intervalos de 30 minutos)
            current_datetime = datetime.combine(appointment_date, current_time)
            next_datetime = current_datetime + timedelta(minutes=30)
            current_time = next_datetime.time()
        
        return jsonify({
            'success': True,
            'data': available_times
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bookings_bp.route('/bookings', methods=['POST'])
def create_booking():
    """Criar novo agendamento"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados não fornecidos'
            }), 400
        
        # Validações
        required_fields = ['service_id', 'client_name', 'client_contact', 'appointment_date', 'appointment_time']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'error': f'Campo {field} é obrigatório'
                }), 400
        
        # Validar serviço
        service = Service.query.get(data['service_id'])
        if not service:
            return jsonify({
                'success': False,
                'error': 'Serviço não encontrado'
            }), 404
        
        # Validar e converter data
        try:
            appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'Formato de data inválido (use YYYY-MM-DD)'
            }), 400
        
        # Validar e converter horário
        try:
            appointment_time = datetime.strptime(data['appointment_time'], '%H:%M').time()
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'Formato de horário inválido (use HH:MM)'
            }), 400
        
        # Verificar se a data não é no passado
        if appointment_date < date.today():
            return jsonify({
                'success': False,
                'error': 'Não é possível agendar para datas passadas'
            }), 400
        
        # Verificar se o horário está disponível
        current_datetime = datetime.combine(appointment_date, appointment_time)
        end_datetime = current_datetime + timedelta(minutes=service.duration_minutes)
        
        existing_bookings = Booking.query.filter(
            and_(
                Booking.appointment_date == appointment_date,
                Booking.status != 'cancelled'
            )
        ).all()
        
        for booking in existing_bookings:
            booking_start = datetime.combine(appointment_date, booking.appointment_time)
            booking_end = booking_start + timedelta(minutes=booking.service.duration_minutes)
            
            if (current_datetime < booking_end and end_datetime > booking_start):
                return jsonify({
                    'success': False,
                    'error': 'Horário não disponível'
                }), 400
        
        # Criar agendamento
        booking = Booking(
            service_id=data['service_id'],
            client_name=data['client_name'].strip(),
            client_contact=data['client_contact'].strip(),
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            status='scheduled'
        )
        
        db.session.add(booking)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Agendamento criado com sucesso',
            'data': booking.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bookings_bp.route('/bookings/<int:booking_id>', methods=['PUT'])
def update_booking(booking_id):
    """Atualizar agendamento"""
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({
                'success': False,
                'error': 'Agendamento não encontrado'
            }), 404
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados não fornecidos'
            }), 400
        
        # Validar serviço se fornecido
        if 'service_id' in data:
            service = Service.query.get(data['service_id'])
            if not service:
                return jsonify({
                    'success': False,
                    'error': 'Serviço não encontrado'
                }), 404
        
        # Validar data se fornecida
        if 'appointment_date' in data:
            try:
                appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
                if appointment_date < date.today():
                    return jsonify({
                        'success': False,
                        'error': 'Não é possível agendar para datas passadas'
                    }), 400
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Formato de data inválido (use YYYY-MM-DD)'
                }), 400
        
        # Validar horário se fornecido
        if 'appointment_time' in data:
            try:
                appointment_time = datetime.strptime(data['appointment_time'], '%H:%M').time()
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Formato de horário inválido (use HH:MM)'
                }), 400
        
        # Atualizar campos
        if 'service_id' in data:
            booking.service_id = data['service_id']
        if 'client_name' in data:
            booking.client_name = data['client_name'].strip()
        if 'client_contact' in data:
            booking.client_contact = data['client_contact'].strip()
        if 'appointment_date' in data:
            booking.appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
        if 'appointment_time' in data:
            booking.appointment_time = datetime.strptime(data['appointment_time'], '%H:%M').time()
        if 'status' in data:
            booking.status = data['status']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Agendamento atualizado com sucesso',
            'data': booking.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bookings_bp.route('/bookings/<int:booking_id>', methods=['DELETE'])
def cancel_booking(booking_id):
    """Cancelar agendamento"""
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({
                'success': False,
                'error': 'Agendamento não encontrado'
            }), 404
        
        booking.status = 'cancelled'
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Agendamento cancelado com sucesso'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

