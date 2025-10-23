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

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-here')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', 
                   ping_timeout=60, ping_interval=25, max_http_buffer_size=1000000,
                   allow_upgrades=False, transports=['polling'],
                   always_connect=True, logger=True, engineio_logger=True)

# Spotify configuration
SPOTIFY_CLIENT_ID = os.getenv('SPOTIPY_CLIENT_ID', '875cb1d855c64a6f90f3050f32ee8342')
SPOTIFY_CLIENT_SECRET = os.getenv('SPOTIPY_CLIENT_SECRET', '575522ab060445dbaf7d918d3e24b7c8')
SPOTIFY_REDIRECT_URI = os.getenv('SPOTIPY_REDIRECT_URI', 'https://joiner.enpointe.io/callback')

# Check if Spotify credentials are set
if SPOTIFY_CLIENT_ID == 'your_spotify_client_id_here' or SPOTIFY_CLIENT_SECRET == 'your_spotify_client_secret_here':
    print("⚠️  WARNING: Spotify credentials not found!")
    print("Please set your Spotify credentials in one of these ways:")
    print("1. Create a .env file with:")
    print("   SPOTIPY_CLIENT_ID=your_actual_client_id")
    print("   SPOTIPY_CLIENT_SECRET=your_actual_client_secret")
    print("   SPOTIPY_REDIRECT_URI=https://joiner.enpointe.io/callback")
    print("2. Or replace the placeholder values directly in this file")
    print("3. Or set environment variables before running the app")

# In-memory storage for rooms and users
rooms = {}
users = {}

class Room:
    def __init__(self, room_id, host_id, host_name):
        self.room_id = room_id
        self.host_id = host_id
        self.host_name = host_name
        self.joiners = {}
        self.current_track = None
        self.is_playing = False
        self.position_ms = 0
        self.last_sync = datetime.now()
        self.sync_requested = False
        self.joiners_ready = set()

    def to_dict(self):
        return {
            'room_id': self.room_id,
            'host_id': self.host_id,
            'host_name': self.host_name,
            'joiners': {uid: user.to_dict() for uid, user in self.joiners.items()},
            'current_track': self.current_track,
            'is_playing': self.is_playing,
            'position_ms': self.position_ms,
            'joiners_ready': list(self.joiners_ready)
        }

class User:
    def __init__(self, user_id, name, spotify_token=None):
        self.user_id = user_id
        self.name = name
        self.spotify_token = spotify_token
        self.is_host = False

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'name': self.name,
            'is_host': self.is_host
        }

def get_spotify_client(token):
    """Get Spotify client with the provided token"""
    return spotipy.Spotify(auth=token)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/login')
def login():
    """Initiate Spotify OAuth login"""
    print("=== SPOTIFY LOGIN INITIATED ===")
    print(f"Client ID: {SPOTIFY_CLIENT_ID}")
    print(f"Client Secret: {SPOTIFY_CLIENT_SECRET[:10]}...")
    print(f"Redirect URI: {SPOTIFY_REDIRECT_URI}")
    
    sp_oauth = SpotifyOAuth(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
        redirect_uri=SPOTIFY_REDIRECT_URI,
        scope='user-read-playback-state user-modify-playback-state user-read-currently-playing'
    )
    auth_url = sp_oauth.get_authorize_url()
    print(f"Generated auth URL: {auth_url}")
    print("=== REDIRECTING TO SPOTIFY ===")
    return redirect(auth_url)

@app.route('/callback')
def callback():
    """Handle Spotify OAuth callback"""
    print("=== SPOTIFY CALLBACK RECEIVED ===")
    print("Request args:", dict(request.args))
    print("Request URL:", request.url)
    
    sp_oauth = SpotifyOAuth(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
        redirect_uri=SPOTIFY_REDIRECT_URI,
        scope='user-read-playback-state user-modify-playback-state user-read-currently-playing'
    )

    code = request.args.get('code')
    error = request.args.get('error')
    
    print(f"Authorization code: {code}")
    print(f"Error (if any): {error}")
    
    if error:
        print(f"=== SPOTIFY ERROR: {error} ===")
        return f"Spotify authentication error: {error}", 400
    
    if not code:
        print("=== NO AUTHORIZATION CODE ===")
        return "No authorization code received", 400
    
    try:
        print("=== ATTEMPTING TO EXCHANGE CODE FOR TOKEN ===")
        # Use get_cached_token to avoid deprecation warning
        token_info = sp_oauth.get_cached_token()
        if not token_info:
            token_info = sp_oauth.get_access_token(code, as_dict=False)
            if isinstance(token_info, str):
                # Convert string token to dict format
                token_info = {
                    'access_token': token_info,
                    'token_type': 'Bearer',
                    'expires_in': 3600,
                    'scope': 'user-read-playback-state user-modify-playback-state user-read-currently-playing'
                }
        
        print(f"Token info received: {bool(token_info)}")
        
        if token_info:
            print("=== TOKEN EXCHANGE SUCCESSFUL ===")
            if isinstance(token_info, dict):
                print(f"Access token: {token_info['access_token'][:20]}...")
                print(f"Token type: {token_info.get('token_type', 'N/A')}")
                print(f"Expires in: {token_info.get('expires_in', 'N/A')} seconds")
                print(f"Scope: {token_info.get('scope', 'N/A')}")
                
                access_token = token_info['access_token']
            else:
                print(f"Access token: {token_info[:20]}...")
                access_token = token_info
                
            session['spotify_token'] = access_token
            session['user_id'] = str(uuid.uuid4())
            redirect_url = f'https://joiner.enpointe.io?token={access_token}'
            print(f"=== REDIRECTING TO: {redirect_url} ===")
            return redirect(redirect_url)
        else:
            print("=== TOKEN EXCHANGE FAILED ===")
            return "Authentication failed", 400
    except Exception as e:
        print(f"=== TOKEN EXCHANGE ERROR: {e} ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Client ID: {SPOTIFY_CLIENT_ID}")
        print(f"Client Secret: {SPOTIFY_CLIENT_SECRET[:10]}...")
        print(f"Redirect URI: {SPOTIFY_REDIRECT_URI}")
        print("=== CHECK SPOTIFY APP SETTINGS ===")
        print("1. Go to https://developer.spotify.com/dashboard")
        print("2. Find your app with Client ID: 875cb1d855c64a6f90f3050f32ee8342")
        print("3. Click 'Edit Settings'")
        print("4. Add Redirect URI: https://joiner.enpointe.io/callback")
        print("5. Save settings")
        return f"Authentication error: {str(e)}", 400

@app.route('/api/rooms', methods=['POST'])
def create_room():
    """Create a new room"""
    data = request.get_json()
    user_id = data.get('user_id')
    user_name = data.get('user_name', 'Host')
    spotify_token = data.get('spotify_token')

    if not user_id:
        return jsonify({'error': 'User ID required'}), 400

    room_id = str(uuid.uuid4())

    # Create user
    user = User(user_id, user_name, spotify_token)
    user.is_host = True

    # Create room
    room = Room(room_id, user_id, user_name)
    room.joiners[user_id] = user

    # Store in memory
    rooms[room_id] = room
    users[user_id] = user

    return jsonify({
        'room_id': room_id,
        'room': room.to_dict()
    })

@app.route('/api/rooms/<room_id>/join', methods=['POST'])
def join_room_api(room_id):
    """Join an existing room"""
    data = request.get_json()
    user_id = data.get('user_id')
    user_name = data.get('user_name', 'Joiner')
    spotify_token = data.get('spotify_token')

    if room_id not in rooms:
        return jsonify({'error': 'Room not found'}), 404

    if user_id in rooms[room_id].joiners:
        return jsonify({'error': 'Already in room'}), 400

    # Create user
    user = User(user_id, user_name, spotify_token)
    rooms[room_id].joiners[user_id] = user
    users[user_id] = user

    # Notify all users in room
    socketio.emit('user_joined', {
        'user': user.to_dict(),
        'room': rooms[room_id].to_dict()
    }, room=room_id)

    return jsonify({
        'room_id': room_id,
        'room': rooms[room_id].to_dict()
    })

@app.route('/api/rooms/<room_id>/leave', methods=['POST'])
def leave_room_api(room_id):
    """Leave a room"""
    data = request.get_json()
    user_id = data.get('user_id')

    if room_id not in rooms:
        return jsonify({'error': 'Room not found'}), 404

    if user_id not in rooms[room_id].joiners:
        return jsonify({'error': 'Not in room'}), 400

    room = rooms[room_id]
    user = room.joiners[user_id]

    # If host is leaving, transfer host to another user or delete room
    if user.is_host and len(room.joiners) > 1:
        # Transfer host to first available joiner
        for uid, u in room.joiners.items():
            if uid != user_id:
                u.is_host = True
                room.host_id = uid
                room.host_name = u.name
                break
    elif user.is_host:
        # Last person leaving, delete room
        del rooms[room_id]
        socketio.emit('room_deleted', room=room_id)
        return jsonify({'message': 'Room deleted'})

    # Remove user from room
    del room.joiners[user_id]
    if user_id in users:
        del users[user_id]

    # Notify remaining users
    socketio.emit('user_left', {
        'user_id': user_id,
        'room': room.to_dict()
    }, room=room_id)

    return jsonify({'message': 'Left room'})

@app.route('/api/rooms/<room_id>/transfer-host', methods=['POST'])
def transfer_host(room_id):
    """Transfer host role to another user"""
    data = request.get_json()
    new_host_id = data.get('new_host_id')

    if room_id not in rooms:
        return jsonify({'error': 'Room not found'}), 404

    room = rooms[room_id]

    if new_host_id not in room.joiners:
        return jsonify({'error': 'User not in room'}), 400

    # Update host
    old_host_id = room.host_id
    room.host_id = new_host_id
    room.host_name = room.joiners[new_host_id].name

    # Update user roles
    for uid, user in room.joiners.items():
        user.is_host = (uid == new_host_id)

    # Notify all users
    socketio.emit('host_transferred', {
        'old_host_id': old_host_id,
        'new_host_id': new_host_id,
        'room': room.to_dict()
    }, room=room_id)

    return jsonify({
        'room_id': room_id,
        'room': room.to_dict()
    })

@app.route('/api/rooms/<room_id>/sync', methods=['POST'])
def request_sync(room_id):
    """Request synchronization from all joiners"""
    if room_id not in rooms:
        return jsonify({'error': 'Room not found'}), 404

    room = rooms[room_id]
    room.sync_requested = True
    room.joiners_ready.clear()

    # Get current playback state from host
    try:
        sp = get_spotify_client(room.joiners[room.host_id].spotify_token)
        playback = sp.current_playback()

        if playback:
            room.current_track = {
                'id': playback['item']['id'] if playback['item'] else None,
                'name': playback['item']['name'] if playback['item'] else None,
                'artists': [artist['name'] for artist in playback['item']['artists']] if playback['item'] else [],
                'uri': playback['item']['uri'] if playback['item'] else None
            }
            room.is_playing = playback['is_playing']
            room.position_ms = playback['progress_ms']

        # Notify all users to sync
        socketio.emit('sync_requested', {
            'current_track': room.current_track,
            'is_playing': room.is_playing,
            'position_ms': room.position_ms,
            'room': room.to_dict()
        }, room=room_id)

        return jsonify({
            'message': 'Sync requested',
            'current_track': room.current_track,
            'is_playing': room.is_playing,
            'position_ms': room.position_ms
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rooms/<room_id>/ready', methods=['POST'])
def mark_ready(room_id):
    """Mark user as ready for synchronized playback"""
    data = request.get_json()
    user_id = data.get('user_id')

    if room_id not in rooms:
        return jsonify({'error': 'Room not found'}), 404

    room = rooms[room_id]

    if user_id not in room.joiners:
        return jsonify({'error': 'User not in room'}), 400

    if room.sync_requested:
        room.joiners_ready.add(user_id)

        # Check if all joiners are ready
        total_joiners = len(room.joiners) - 1  # Exclude host
        if len(room.joiners_ready) >= total_joiners:
            room.sync_requested = False
            socketio.emit('all_ready', {
                'current_track': room.current_track,
                'is_playing': room.is_playing,
                'position_ms': room.position_ms,
                'room': room.to_dict()
            }, room=room_id)

    return jsonify({
        'ready': True,
        'joiners_ready': len(room.joiners_ready),
        'total_joiners': len(room.joiners) - 1
    })

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('join_room')
def handle_join_room(data):
    room_id = data['room_id']
    join_room(room_id)
    print(f'Client joined room: {room_id}')

@socketio.on('leave_room')
def handle_leave_room(data):
    room_id = data['room_id']
    leave_room(room_id)
    print(f'Client left room: {room_id}')

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
