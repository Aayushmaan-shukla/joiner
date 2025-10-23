// Spotify Collaborative Music App
class SpotifyCollabApp {
    constructor() {
        this.socket = io('https://joiner.enpointe.io');
        this.spotifyToken = null;
        this.userId = null;
        this.currentRoom = null;
        this.isHost = false;
        this.spotifyPlayer = null;
        this.deviceId = null;
        this.isReady = false;

        this.initializeElements();
        this.bindEvents();
        this.setupSocketListeners();
        this.initializeSpotifySDK();
    }

    initializeElements() {
        // Auth elements
        this.loginBtn = document.getElementById('login-btn');

        // Room elements
        this.roomSection = document.getElementById('room-section');
        this.userNameInput = document.getElementById('user-name');
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.joinRoomIdInput = document.getElementById('join-room-id');
        this.joinUserNameInput = document.getElementById('join-user-name');
        this.joinRoomBtn = document.getElementById('join-room-btn');

        // Room interface elements
        this.roomInterface = document.getElementById('room-interface');
        this.roomIdDisplay = document.getElementById('room-id-display');
        this.userRoleBadge = document.getElementById('user-role');
        this.leaveRoomBtn = document.getElementById('leave-room-btn');

        // Host controls
        this.hostControls = document.getElementById('host-controls');
        this.syncBtn = document.getElementById('sync-btn');
        this.transferHostBtn = document.getElementById('transfer-host-btn');

        // Playback controls
        this.playbackControls = document.getElementById('playback-controls');
        this.playBtn = document.getElementById('play-btn');
        this.pauseBtn = document.getElementById('pause-btn');

        // Current track
        this.currentTrackSection = document.getElementById('current-track');
        this.currentTrackInfo = document.getElementById('current-track');

        // Sync status
        this.syncStatus = document.getElementById('sync-status');
        this.syncMessage = document.getElementById('sync-message');
        this.readyBtn = document.getElementById('ready-btn');

        // Participants
        this.participantsList = document.getElementById('participants-list');

        // Share link
        this.shareSection = document.getElementById('share-section');
        this.shareLinkInput = document.getElementById('share-link-input');
        this.copyLinkBtn = document.getElementById('copy-link-btn');
    }

    bindEvents() {
        // Authentication
        this.loginBtn.addEventListener('click', () => this.loginToSpotify());

        // Room creation/joining
        this.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.joinRoomBtn.addEventListener('click', () => this.joinRoom());

        // Room interface
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());

        // Host controls
        this.syncBtn.addEventListener('click', () => this.requestSync());
        this.transferHostBtn.addEventListener('click', () => this.transferHost());

        // Playback controls
        this.playBtn.addEventListener('click', () => this.playMusic());
        this.pauseBtn.addEventListener('click', () => this.pauseMusic());

        // Sync controls
        this.readyBtn.addEventListener('click', () => this.markReady());

        // Share link
        this.copyLinkBtn.addEventListener('click', () => this.copyShareLink());
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('user_joined', (data) => {
            this.updateParticipants(data.room);
        });

        this.socket.on('user_left', (data) => {
            this.updateParticipants(data.room);
        });

        this.socket.on('host_transferred', (data) => {
            this.handleHostTransfer(data);
        });

        this.socket.on('sync_requested', (data) => {
            this.handleSyncRequest(data);
        });

        this.socket.on('all_ready', (data) => {
            this.handleAllReady(data);
        });

        this.socket.on('room_deleted', () => {
            this.handleRoomDeleted();
        });
    }

    initializeSpotifySDK() {
        window.onSpotifyWebPlaybackSDKReady = () => {
            this.initializeSpotifyPlayer();
        };
    }

    initializeSpotifyPlayer() {
        const token = this.spotifyToken;
        if (!token) return;

        this.spotifyPlayer = new Spotify.Player({
            name: 'Spotify Collaborative Player',
            getOAuthToken: cb => cb(token),
            volume: 0.5
        });

        // Player event listeners
        this.spotifyPlayer.addListener('ready', ({ device_id }) => {
            console.log('Spotify player ready');
            this.deviceId = device_id;
        });

        this.spotifyPlayer.addListener('player_state_changed', (state) => {
            this.handlePlayerStateChange(state);
        });

        this.spotifyPlayer.connect();
    }

    async loginToSpotify() {
        // Directly navigate to the login endpoint instead of using fetch
        window.location.href = 'https://joiner.enpointe.io/login';
    }

    async createRoom() {
        const userName = this.userNameInput.value.trim();
        if (!userName) {
            alert('Please enter your name');
            return;
        }

        try {
            const response = await fetch('https://joiner.enpointe.io/api/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.generateUserId(),
                    user_name: userName,
                    spotify_token: this.spotifyToken
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentRoom = data.room;
                this.isHost = true;
                
                // Persist room state to localStorage
                localStorage.setItem('currentRoomId', data.room_id);
                localStorage.setItem('currentRoomData', JSON.stringify(data.room));
                localStorage.setItem('userRole', 'host');
                
                this.showRoomInterface();
                this.socket.emit('join_room', { room_id: data.room_id });
                this.generateShareLink(data.room_id);
            } else {
                alert(data.error || 'Failed to create room');
            }
        } catch (error) {
            console.error('Create room error:', error);
            alert('Failed to create room');
        }
    }

    async joinRoom() {
        const roomId = this.joinRoomIdInput.value.trim();
        const userName = this.joinUserNameInput.value.trim();

        if (!roomId || !userName) {
            alert('Please enter room ID and your name');
            return;
        }

        try {
            const response = await fetch(`https://joiner.enpointe.io/api/rooms/${roomId}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.generateUserId(),
                    user_name: userName,
                    spotify_token: this.spotifyToken
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentRoom = data.room;
                this.isHost = false;
                
                // Persist room state to localStorage
                localStorage.setItem('currentRoomId', roomId);
                localStorage.setItem('currentRoomData', JSON.stringify(data.room));
                localStorage.setItem('userRole', 'joiner');
                
                this.showRoomInterface();
                this.socket.emit('join_room', { room_id: roomId });
                this.generateShareLink(roomId);
            } else {
                alert(data.error || 'Failed to join room');
            }
        } catch (error) {
            console.error('Join room error:', error);
            alert('Failed to join room');
        }
    }

    async leaveRoom() {
        if (!this.currentRoom) return;

        try {
            await fetch(`https://joiner.enpointe.io/api/rooms/${this.currentRoom.room_id}/leave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.userId
                })
            });

            this.socket.emit('leave_room', { room_id: this.currentRoom.room_id });
            
            // Clear persisted room state
            localStorage.removeItem('currentRoomId');
            localStorage.removeItem('currentRoomData');
            localStorage.removeItem('userRole');
            
            this.resetToRoomSelection();
        } catch (error) {
            console.error('Leave room error:', error);
        }
    }

    async requestSync() {
        if (!this.isHost || !this.currentRoom) return;

        try {
            const response = await fetch(`https://joiner.enpointe.io/api/rooms/${this.currentRoom.room_id}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                console.log('Sync requested');
            }
        } catch (error) {
            console.error('Sync request error:', error);
        }
    }

    async transferHost() {
        if (!this.isHost || !this.currentRoom) return;

        // For simplicity, transfer to first joiner
        const joiners = Object.values(this.currentRoom.joiners).filter(user => !user.is_host);
        if (joiners.length === 0) {
            alert('No other users to transfer host to');
            return;
        }

        try {
            await fetch(`https://joiner.enpointe.io/api/rooms/${this.currentRoom.room_id}/transfer-host`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    new_host_id: joiners[0].user_id
                })
            });
        } catch (error) {
            console.error('Transfer host error:', error);
        }
    }

    async markReady() {
        if (!this.currentRoom) return;

        try {
            const response = await fetch(`https://joiner.enpointe.io/api/rooms/${this.currentRoom.room_id}/ready`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.userId
                })
            });

            const data = await response.json();
            this.isReady = true;
            this.readyBtn.textContent = '✅ Ready';
            this.readyBtn.disabled = true;

            if (data.total_joiners > 0) {
                this.syncMessage.textContent = `${data.joiners_ready}/${data.total_joiners} users ready`;
            }
        } catch (error) {
            console.error('Mark ready error:', error);
        }
    }

    async playMusic() {
        if (!this.spotifyPlayer || !this.deviceId) return;

        try {
            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.spotifyToken}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Play music error:', error);
        }
    }

    async pauseMusic() {
        if (!this.spotifyPlayer || !this.deviceId) return;

        try {
            await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${this.deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.spotifyToken}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Pause music error:', error);
        }
    }

    showRoomInterface() {
        this.roomSection.classList.add('hidden');
        this.roomInterface.classList.remove('hidden');
        this.shareSection.classList.remove('hidden');

        this.roomIdDisplay.textContent = this.currentRoom.room_id.substring(0, 8) + '...';
        this.updateUserRole();
        this.updateParticipants(this.currentRoom);

        if (this.isHost) {
            this.hostControls.classList.remove('hidden');
        }
    }

    resetToRoomSelection() {
        this.roomSection.classList.remove('hidden');
        this.roomInterface.classList.add('hidden');
        this.shareSection.classList.add('hidden');
        this.currentRoom = null;
        this.isHost = false;
        this.isReady = false;
    }

    updateUserRole() {
        if (this.isHost) {
            this.userRoleBadge.textContent = '👑 Host';
            this.userRoleBadge.className = 'badge host';
            this.playbackControls.classList.remove('hidden');
        } else {
            this.userRoleBadge.textContent = 'Joiner';
            this.userRoleBadge.className = 'badge joiner';
        }
    }

    updateParticipants(room) {
        this.participantsList.innerHTML = '';

        Object.values(room.joiners).forEach(user => {
            const participantDiv = document.createElement('div');
            participantDiv.className = `participant ${user.is_host ? 'host' : ''}`;

            participantDiv.innerHTML = `
                <span class="participant-name">${user.name} ${user.is_host ? '👑' : ''}</span>
                <span class="participant-role">${user.is_host ? 'Host' : 'Joiner'}</span>
            `;

            this.participantsList.appendChild(participantDiv);
        });
    }

    handleHostTransfer(data) {
        this.isHost = (data.new_host_id === this.userId);
        this.currentRoom = data.room;
        
        // Update stored role
        localStorage.setItem('userRole', this.isHost ? 'host' : 'joiner');
        localStorage.setItem('currentRoomData', JSON.stringify(data.room));
        
        this.updateUserRole();
        this.updateParticipants(data.room);

        if (this.isHost) {
            this.hostControls.classList.remove('hidden');
            this.playbackControls.classList.remove('hidden');
        } else {
            this.hostControls.classList.add('hidden');
            this.playbackControls.classList.add('hidden');
        }
    }

    handleSyncRequest(data) {
        this.syncStatus.classList.remove('hidden');
        this.syncMessage.textContent = '🔄 Sync requested! Please wait for the track to load...';

        if (data.current_track) {
            this.updateCurrentTrack(data.current_track);
        }

        if (this.spotifyPlayer && this.deviceId && data.current_track?.uri) {
            this.spotifyPlayer._options.getOAuthToken((token) => {
                fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        uris: [data.current_track.uri],
                        position_ms: data.position_ms
                    })
                }).then(() => {
                    if (!data.is_playing) {
                        return fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${this.deviceId}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                    }
                }).catch(error => {
                    console.error('Sync playback error:', error);
                });
            });
        }
    }

    handleAllReady(data) {
        this.syncStatus.classList.add('hidden');
        this.syncMessage.textContent = '';
        this.readyBtn.textContent = '✅ Ready';
        this.readyBtn.disabled = false;
        this.isReady = false;

        if (data.is_playing) {
            this.playMusic();
        }
    }

    handleRoomDeleted() {
        alert('Room has been deleted');
        
        // Clear persisted room state
        localStorage.removeItem('currentRoomId');
        localStorage.removeItem('currentRoomData');
        localStorage.removeItem('userRole');
        
        this.resetToRoomSelection();
    }

    handlePlayerStateChange(state) {
        if (state && state.track_window && state.track_window.current_track) {
            const track = state.track_window.current_track;
            this.updateCurrentTrack({
                id: track.id,
                name: track.name,
                artists: track.artists.map(artist => artist.name),
                uri: track.uri
            });
        }
    }

    updateCurrentTrack(track) {
        if (!track || !track.name) {
            this.currentTrackInfo.innerHTML = '<div class="track-placeholder">No track playing</div>';
            return;
        }

        this.currentTrackInfo.innerHTML = `
            <div class="track-details">
                <div class="track-cover">🎵</div>
                <div class="track-text">
                    <h4>${track.name}</h4>
                    <div class="track-artist">${track.artists.join(', ')}</div>
                </div>
            </div>
        `;
    }

    generateShareLink(roomId) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        this.shareLinkInput.value = shareUrl;
    }

    copyShareLink() {
        this.shareLinkInput.select();
        document.execCommand('copy');
        alert('Link copied to clipboard!');
    }

    generateUserId() {
        this.userId = 'user_' + Math.random().toString(36).substr(2, 9);
        return this.userId;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check for Spotify token in URL parameters or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const roomIdFromUrl = urlParams.get('room');
    
    // Check localStorage for persisted state
    const storedToken = localStorage.getItem('spotifyToken');
    const storedRoomId = localStorage.getItem('currentRoomId');
    const storedRoomData = localStorage.getItem('currentRoomData');
    const storedUserRole = localStorage.getItem('userRole');

    console.log('URL params:', window.location.search);
    console.log('Token from URL:', tokenFromUrl);
    console.log('Token from localStorage:', storedToken);
    console.log('Room ID from URL:', roomIdFromUrl);
    console.log('Room ID from localStorage:', storedRoomId);

    // Use token from URL if available, otherwise use stored token
    const token = tokenFromUrl || storedToken;
    const roomId = roomIdFromUrl || storedRoomId;

    if (token) {
        console.log('Token detected, initializing app');
        
        // Store token in localStorage for persistence
        if (tokenFromUrl) {
            localStorage.setItem('spotifyToken', token);
        }

        // Initialize app with token
        window.spotifyApp = new SpotifyCollabApp();
        window.spotifyApp.spotifyToken = token;

        // Check if we need to restore room state
        if (storedRoomData && storedRoomId) {
            console.log('Restoring room state from localStorage');
            try {
                const roomData = JSON.parse(storedRoomData);
                window.spotifyApp.currentRoom = roomData;
                window.spotifyApp.isHost = storedUserRole === 'host';
                
                // Show room interface
                window.spotifyApp.showRoomInterface();
                
                // Reconnect to room via socket
                window.spotifyApp.socket.emit('join_room', { room_id: storedRoomId });
                
                // Update participants
                window.spotifyApp.updateParticipants(roomData);
                
                console.log('Room state restored successfully');
            } catch (error) {
                console.error('Error restoring room state:', error);
                // Clear invalid stored data
                localStorage.removeItem('currentRoomData');
                localStorage.removeItem('currentRoomId');
                localStorage.removeItem('userRole');
                
                // Show room section for new room creation/joining
                document.getElementById('auth-section').classList.add('hidden');
                document.getElementById('room-section').classList.remove('hidden');
            }
        } else if (roomId) {
            // If room ID is provided in URL, try to join automatically
            window.spotifyApp.joinRoomIdInput.value = roomId;
            document.getElementById('auth-section').classList.add('hidden');
            document.getElementById('room-section').classList.remove('hidden');
        } else {
            // Show room section for new room creation/joining
            document.getElementById('auth-section').classList.add('hidden');
            document.getElementById('room-section').classList.remove('hidden');
        }
    } else {
        console.log('No token found, showing auth section');
        // Clear any stored data if no token
        localStorage.removeItem('spotifyToken');
        localStorage.removeItem('currentRoomData');
        localStorage.removeItem('currentRoomId');
        localStorage.removeItem('userRole');
        
        // Show auth section
        document.getElementById('auth-section').classList.remove('hidden');
        window.spotifyApp = new SpotifyCollabApp();
    }
});
