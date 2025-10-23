# Spotify Collaborative Music API Documentation

## Overview
This API provides endpoints for creating and managing collaborative Spotify music listening sessions. Users can create rooms, join existing rooms, and synchronize music playback across multiple devices.

## Base URL
```
http://localhost:5000
```

## Authentication
The API uses Spotify OAuth 2.0 for authentication. Users must authenticate with Spotify to obtain an access token before using the collaborative features.

### Authentication Flow
1. Redirect user to `/login` endpoint
2. User authorizes the application on Spotify
3. Spotify redirects back to `/callback` with authorization code
4. Application exchanges code for access token
5. Access token is returned in redirect URL

## Endpoints

### 1. Create Room
**POST** `/api/rooms`

Creates a new collaborative music room.

**Request Body:**
```json
{
    "user_id": "string",
    "user_name": "string",
    "spotify_token": "string"
}
```

**Response:**
```json
{
    "room_id": "uuid-string",
    "room": {
        "room_id": "uuid-string",
        "host_id": "string",
        "host_name": "string",
        "joiners": {},
        "current_track": null,
        "is_playing": false,
        "position_ms": 0,
        "joiners_ready": []
    }
}
```

**Status Codes:**
- `200`: Room created successfully
- `400`: Invalid request data

### 2. Join Room
**POST** `/api/rooms/{room_id}/join`

Join an existing room.

**Request Body:**
```json
{
    "user_id": "string",
    "user_name": "string",
    "spotify_token": "string"
}
```

**Response:**
```json
{
    "room_id": "string",
    "room": {
        "room_id": "string",
        "host_id": "string",
        "host_name": "string",
        "joiners": {
            "user_id": {
                "user_id": "string",
                "name": "string",
                "is_host": false
            }
        },
        "current_track": null,
        "is_playing": false,
        "position_ms": 0,
        "joiners_ready": []
    }
}
```

**Status Codes:**
- `200`: Successfully joined room
- `404`: Room not found
- `400`: Already in room or invalid data

### 3. Leave Room
**POST** `/api/rooms/{room_id}/leave`

Leave a room. If the host leaves and there are other users, host privileges are transferred to another user.

**Request Body:**
```json
{
    "user_id": "string"
}
```

**Response:**
```json
{
    "message": "Left room"
}
```

**Status Codes:**
- `200`: Successfully left room
- `404`: Room not found
- `400`: Not in room

### 4. Transfer Host
**POST** `/api/rooms/{room_id}/transfer-host`

Transfer host privileges to another user in the room.

**Request Body:**
```json
{
    "new_host_id": "string"
}
```

**Response:**
```json
{
    "room_id": "string",
    "room": {
        "room_id": "string",
        "host_id": "string",
        "host_name": "string",
        "joiners": {},
        "current_track": null,
        "is_playing": false,
        "position_ms": 0,
        "joiners_ready": []
    }
}
```

**Status Codes:**
- `200`: Host transferred successfully
- `404`: Room not found
- `400`: User not in room

### 5. Request Sync
**POST** `/api/rooms/{room_id}/sync`

Request synchronization of all joiners to the host's current playback state.

**Response:**
```json
{
    "message": "Sync requested",
    "current_track": {
        "id": "string",
        "name": "string",
        "artists": ["string"],
        "uri": "string"
    },
    "is_playing": false,
    "position_ms": 0
}
```

**Status Codes:**
- `200`: Sync requested successfully
- `404`: Room not found

### 6. Mark Ready
**POST** `/api/rooms/{room_id}/ready`

Mark a user as ready for synchronized playback.

**Request Body:**
```json
{
    "user_id": "string"
}
```

**Response:**
```json
{
    "ready": true,
    "joiners_ready": 2,
    "total_joiners": 3
}
```

**Status Codes:**
- `200`: User marked as ready
- `404`: Room not found
- `400`: User not in room

## WebSocket Events

### Client to Server Events

#### `join_room`
Join a Socket.IO room for real-time updates.

**Data:**
```json
{
    "room_id": "string"
}
```

#### `leave_room`
Leave a Socket.IO room.

**Data:**
```json
{
    "room_id": "string"
}
```

### Server to Client Events

#### `user_joined`
Notifies all room participants when a new user joins.

**Data:**
```json
{
    "user": {
        "user_id": "string",
        "name": "string",
        "is_host": false
    },
    "room": {
        "room_id": "string",
        "host_id": "string",
        "host_name": "string",
        "joiners": {},
        "current_track": null,
        "is_playing": false,
        "position_ms": 0,
        "joiners_ready": []
    }
}
```

#### `user_left`
Notifies all room participants when a user leaves.

**Data:**
```json
{
    "user_id": "string",
    "room": {
        "room_id": "string",
        "host_id": "string",
        "host_name": "string",
        "joiners": {},
        "current_track": null,
        "is_playing": false,
        "position_ms": 0,
        "joiners_ready": []
    }
}
```

#### `host_transferred`
Notifies all room participants when host privileges are transferred.

**Data:**
```json
{
    "old_host_id": "string",
    "new_host_id": "string",
    "room": {
        "room_id": "string",
        "host_id": "string",
        "host_name": "string",
        "joiners": {},
        "current_track": null,
        "is_playing": false,
        "position_ms": 0,
        "joiners_ready": []
    }
}
```

#### `sync_requested`
Notifies all joiners to sync to the host's current playback state.

**Data:**
```json
{
    "current_track": {
        "id": "string",
        "name": "string",
        "artists": ["string"],
        "uri": "string"
    },
    "is_playing": false,
    "position_ms": 0,
    "room": {
        "room_id": "string",
        "host_id": "string",
        "host_name": "string",
        "joiners": {},
        "current_track": null,
        "is_playing": false,
        "position_ms": 0,
        "joiners_ready": []
    }
}
```

#### `all_ready`
Notifies all participants when all joiners are ready for synchronized playback.

**Data:**
```json
{
    "current_track": {
        "id": "string",
        "name": "string",
        "artists": ["string"],
        "uri": "string"
    },
    "is_playing": false,
    "position_ms": 0,
    "room": {
        "room_id": "string",
        "host_id": "string",
        "host_name": "string",
        "joiners": {},
        "current_track": null,
        "is_playing": false,
        "position_ms": 0,
        "joiners_ready": []
    }
}
```

#### `room_deleted`
Notifies all participants when a room is deleted.

## Error Handling

All endpoints return appropriate HTTP status codes and error messages in the following format:

```json
{
    "error": "Error description"
}
```

Common status codes:
- `200`: Success
- `400`: Bad Request (invalid data)
- `404`: Not Found (room or user not found)
- `500`: Internal Server Error

## Data Models

### Room Object
```json
{
    "room_id": "string",
    "host_id": "string",
    "host_name": "string",
    "joiners": {
        "user_id": {
            "user_id": "string",
            "name": "string",
            "is_host": false
        }
    },
    "current_track": {
        "id": "string",
        "name": "string",
        "artists": ["string"],
        "uri": "string"
    },
    "is_playing": false,
    "position_ms": 0,
    "joiners_ready": ["string"]
}
```

### User Object
```json
{
    "user_id": "string",
    "name": "string",
    "is_host": false
}
```

### Track Object
```json
{
    "id": "string",
    "name": "string",
    "artists": ["string"],
    "uri": "string"
}
```

## Usage Examples

### Creating a Room
```javascript
fetch('http://localhost:5000/api/rooms', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        user_id: 'user_123',
        user_name: 'Alice',
        spotify_token: 'spotify_access_token'
    })
})
.then(response => response.json())
.then(data => console.log('Room created:', data.room_id));
```

### Joining a Room
```javascript
fetch('http://localhost:5000/api/rooms/room_456/join', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        user_id: 'user_789',
        user_name: 'Bob',
        spotify_token: 'spotify_access_token'
    })
})
.then(response => response.json())
.then(data => console.log('Joined room successfully'));
```

### Requesting Sync
```javascript
fetch('http://localhost:5000/api/rooms/room_456/sync', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    }
})
.then(response => response.json())
.then(data => console.log('Sync requested'));
```

## Rate Limits
Currently, there are no rate limits implemented. However, Spotify API rate limits should be respected for playback operations.
