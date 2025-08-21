
# Chariot Arena Backend API

A simple Express.js backend server for managing high scores in the Chariot Arena game.

## Features

- **GET /highscores** - Retrieve top 10 high scores sorted by score (descending)
- **POST /highscores** - Submit a new high score
- **GET /health** - Health check endpoint
- CORS enabled for cross-origin requests
- JSON file-based storage (scores.json)
- Input validation and error handling

## Installation

1. Navigate to the server directory:
```bash
cd src/server
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Development
```bash
npm run dev
```
This uses nodemon for auto-restarting on file changes.

### Production
```bash
npm start
```

The server will start on port 3000 by default (or the PORT environment variable).

## API Endpoints

### GET /highscores
Returns the top 10 high scores.

**Response:**
```json
{
  "success": true,
  "scores": [
    {
      "name": "Player1",
      "score": 15000,
      "timestamp": "2024-01-01T12:00:00.000Z",
      "id": 1704110400000.123
    }
  ],
  "total": 25
}
```

### POST /highscores
Submit a new high score.

**Request Body:**
```json
{
  "name": "PlayerName",
  "score": 12500
}
```

**Response:**
```json
{
  "success": true,
  "message": "Score submitted successfully",
  "score": {
    "name": "PlayerName",
    "score": 12500,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "id": 1704110400000.456
  },
  "ranking": 3,
  "isTopTen": true
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "success": true,
  "message": "Chariot Arena API Server is running",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Data Storage

High scores are stored in `scores.json` in the following format:
```json
[
  {
    "name": "Player Name",
    "score": 15000,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "id": 1704110400000.123
  }
]
```

## Error Handling

The API returns appropriate HTTP status codes:
- 200: Success
- 201: Created (new score)
- 400: Bad Request (validation errors)
- 404: Not Found
- 500: Internal Server Error

All error responses follow this format:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Environment Variables

- `PORT` - Server port (default: 3000)

## Testing the API

You can test the endpoints using curl:

```bash
# Get high scores
curl http://localhost:3000/highscores

# Submit a new score
curl -X POST http://localhost:3000/highscores \
  -H "Content-Type: application/json" \
  -d '{"name": "TestPlayer", "score": 1500}'

# Health check
curl http://localhost:3000/health
```

## Security Considerations

This is a basic implementation suitable for development and small-scale deployment. For production use, consider:

- Adding authentication/authorization
- Rate limiting
- Input sanitization
- Database instead of JSON file
- HTTPS enforcement
- Logging and monitoring
