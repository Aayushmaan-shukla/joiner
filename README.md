# 🎵 Spotify Collaborative Music

A real-time collaborative music listening application that allows multiple users to listen to Spotify music together with synchronized playback controls.

## Features

- **Room-based Sessions**: Create or join collaborative music rooms
- **Host Controls**: One host controls playback, others can join as listeners
- **Real-time Sync**: Synchronize music playback across all connected devices
- **Host Transfer**: Transfer hosting privileges to other users
- **Ready System**: Joiners can mark themselves as "ready" for synchronized playback
- **Shareable Links**: Easy room sharing with generated links
- **Spotify Integration**: Full Spotify Web Playback SDK integration

## Architecture

- **Backend**: Python Flask with Socket.IO for real-time communication
- **Frontend**: HTML/CSS/JavaScript with Spotify Web Playback SDK
- **Database**: In-memory storage (for demo purposes)
- **Authentication**: Spotify OAuth 2.0

## Prerequisites

- Python 3.7+
- Spotify Developer Account (with Client ID and Client Secret)
- Modern web browser with JavaScript enabled

## Installation

### 1. Clone and Setup

```bash
cd spotifyjoiner
pip install -r requirements.txt
```

### 2. Spotify Developer Setup

1. Go to [Spotify Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://localhost:5000/callback` as a redirect URI
4. Copy your Client ID and Client Secret

### 3. Configuration

Update the `.env` file with your Spotify credentials:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:5000/callback
SECRET_KEY=your-secret-key-here
```

### 4. Run the Application

```bash
python app.py
```

The application will start on `http://localhost:5000`

## Usage

### Getting Started

1. **Authentication**: Click "Login with Spotify" to authenticate
2. **Create or Join Room**:
   - To create: Enter your name and click "Create Room"
   - To join: Enter room ID and your name, then click "Join Room"
3. **Share Room**: Copy the generated link to share with friends

### User Roles

- **Host**: Controls playback and can initiate sync
- **Joiner**: Can listen to synchronized music and mark as "ready"

### Controls

#### Host Controls
- **Sync All**: Pause all devices and sync to current playback position
- **Transfer Host**: Pass hosting privileges to another user
- **Play/Pause**: Control playback on all connected devices

#### Joiner Controls
- **Ready Button**: Mark yourself as ready for synchronized playback
- **Play/Pause**: Control playback on your own device

### Synchronization Flow

1. Host initiates sync
2. All joiners receive sync request
3. Joiners mark themselves as "ready"
4. When all joiners are ready, synchronized playback begins
5. Music plays in sync across all devices

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rooms` | Create a new room |
| POST | `/api/rooms/{room_id}/join` | Join an existing room |
| POST | `/api/rooms/{room_id}/leave` | Leave a room |
| POST | `/api/rooms/{room_id}/transfer-host` | Transfer host privileges |
| POST | `/api/rooms/{room_id}/sync` | Request synchronization |
| POST | `/api/rooms/{room_id}/ready` | Mark user as ready |

For detailed API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

## File Structure

```
spotifyjoiner/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables
├── index.html             # Main HTML interface
├── styles.css             # CSS styling
├── app.js                 # Frontend JavaScript
├── README.md              # This file
└── API_DOCUMENTATION.md   # API documentation
```

## Development

### Adding New Features

1. **Backend Changes**: Modify `app.py` for new endpoints or logic
2. **Frontend Changes**: Update `app.js` for new UI interactions
3. **Styling**: Modify `styles.css` for visual changes
4. **API Documentation**: Update `API_DOCUMENTATION.md`

### Testing

Test the application with multiple browser tabs or devices:

1. Create a room in one tab
2. Copy the room link
3. Open the link in another tab/incognito window
4. Test synchronization features

## Troubleshooting

### Common Issues

1. **Spotify Authentication Fails**
   - Ensure redirect URI matches exactly in Spotify Dashboard
   - Check that Client ID and Secret are correct

2. **Playback Doesn't Sync**
   - Ensure all users have Spotify Premium
   - Check browser console for JavaScript errors
   - Verify WebSocket connection (check Network tab)

3. **Room Not Found**
   - Check that room ID is entered correctly
   - Ensure backend is running on correct port

### Debug Mode

Run with debug logging:

```bash
python app.py
```

Check browser console for client-side errors and server logs for backend issues.

## Spotify API Limitations

- Requires Spotify Premium for Web Playback SDK
- Rate limits apply to API calls
- Some features may not work in all regions

## Security Considerations

- Access tokens are stored in memory only
- No persistent storage of user data
- Room IDs are UUIDs for uniqueness
- CORS is enabled for cross-origin requests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational purposes. Spotify API terms apply.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check browser console and server logs
4. Ensure all prerequisites are met

## Future Enhancements

- [ ] Persistent room storage
- [ ] User authentication system
- [ ] Playlist management
- [ ] Mobile app support
- [ ] Advanced audio controls
- [ ] Room chat functionality
- [ ] Playback history

---

Built with ❤️ using Flask, Socket.IO, and Spotify Web Playback SDK
