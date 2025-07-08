import os
import sys

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client

SUPABASE_URL = "https://cubssfddgbtupbmqoxlw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1YnNzZmRkZ2J0dXBibXFveGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMzI4MzQsImV4cCI6MjA2NjcwODgzNH0.A42zT1-lXVJ4Z8mBjDx2HwRgxGvWrIFuRuXyfKYlICU"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

from src.models.agendai import db
from src.routes.profile import profile_bp
from src.routes.services import services_bp
from src.routes.bookings import bookings_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'agendai_secret_key_2024'

# Configurar CORS para permitir requisições do frontend
CORS(app, origins=['*'])

# Registrar blueprints
app.register_blueprint(profile_bp, url_prefix='/api')
app.register_blueprint(services_bp, url_prefix='/api')
app.register_blueprint(bookings_bp, url_prefix='/api')

# Configurar banco de dados local (SQLite)
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'agendai.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

db.init_app(app)
with app.app_context():
    db.create_all()

# Servir frontend (index.html)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

# Rota para servir arquivos enviados
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    uploads_folder = os.path.join(app.static_folder, 'uploads')
    return send_from_directory(uploads_folder, filename)

# Health check da API
@app.route('/api/health')
def health_check():
    return {'status': 'ok', 'message': 'AgendAI API is running'}, 200

# Teste de leitura da tabela 'servicos'
@app.route('/api/teste-supabase')
def teste_supabase():
    response = supabase.table("servicos").select("*").execute()
    return {'dados': response.data}

# Criar novo agendamento
@app.route('/api/agendar', methods=['POST'])
def agendar():
    dados = request.json
    response = supabase.table("agendamentos").insert({
        "nome": dados.get("nome"),
        "email": dados.get("email"),
        "servico": dados.get("servico"),
        "data": dados.get("data")
    }).execute()
    
    if response.error:
        print("Erro ao criar agendamento:", response.error)  # aparecerá nos logs da Render
        return jsonify({"erro": str(response.error)}), 400

    return jsonify({"mensagem": "Agendamento criado com sucesso"}), 201

# Listar agendamentos
@app.route('/api/agendamentos', methods=['GET'])
def listar_agendamentos():
    response = supabase.table("agendamentos").select("*").order("data", desc=False).execute()
    return jsonify(response.data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)