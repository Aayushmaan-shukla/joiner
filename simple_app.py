from flask import Flask, request, jsonify, session, redirect, url_for, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import os
import time
import json
from datetime import datetime
import uuid
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("Starting Flask app...")

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = 'your-secret-key-here'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Spotify configuration
SPOTIFY_CLIENT_ID = '81417b679d8f4ed3803560e46b9ce629'
SPOTIFY_CLIENT_SECRET = 'acda24b80f3649158dbf55e1fc085a4a'
SPOTIFY_REDIRECT_URI = 'http://localhost:5000/callback'

print(f"Spotify Client ID: {SPOTIFY_CLIENT_ID}")
print(f"Spotify Client Secret: {SPOTIFY_CLIENT_SECRET[:10]}...")

@app.route('/')
def index():
    print("Serving index.html")
    return send_from_directory('.', 'index.html')

@app.route('/login')
def login():
    print("Login route called")
    sp_oauth = SpotifyOAuth(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
        redirect_uri=SPOTIFY_REDIRECT_URI,
        scope='user-read-playback-state user-modify-playback-state user-read-currently-playing'
    )
    auth_url = sp_oauth.get_authorize_url()
    print(f"Redirecting to: {auth_url}")
    return redirect(auth_url)

@app.route('/callback')
def callback():
    print("Callback received!")
    print("Request args:", request.args)
    
    sp_oauth = SpotifyOAuth(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
        redirect_uri=SPOTIFY_REDIRECT_URI,
        scope='user-read-playback-state user-modify-playback-state user-read-currently-playing'
    )

    code = request.args.get('code')
    print(f"Authorization code: {code}")
    
    if not code:
        return "No authorization code received", 400
    
    try:
        token_info = sp_oauth.get_access_token(code)
        print(f"Token info received: {bool(token_info)}")
        
        if token_info:
            session['spotify_token'] = token_info['access_token']
            session['user_id'] = str(uuid.uuid4())
            redirect_url = f'http://localhost:5000?token={token_info["access_token"]}'
            print(f"Redirecting to: {redirect_url}")
            return redirect(redirect_url)
        else:
            print("Failed to get token info")
            return "Authentication failed", 400
    except Exception as e:
        print(f"Error in callback: {e}")
        return f"Authentication error: {str(e)}", 400

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    print("Starting server on http://localhost:5000")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
