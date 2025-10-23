# Canvas Collaboration - Real-time Multi-user Drawing Board

A real-time collaborative drawing application that allows multiple users to draw together on the same canvas simultaneously. Built with Vue 3, Vite, Node.js, Koa2, and Socket.IO for seamless real-time synchronization.

## Features

- Real-time collaborative drawing with multiple users
- Drawing tools: Brush and Eraser
- Color picker with preset colors
- Adjustable brush and eraser sizes
- Drawing style selection (solid, dashed, dotted)
- Clear canvas functionality
- Save and load drawings
- Background image selection
- Responsive design with desktop and mobile modes
- Full-screen mode support
- Real-time user count display
- WebSocket-based synchronization 

## Technology Stack

### Frontend
- Vue 3 with Composition API
- Vite build tool
- Socket.IO Client for real-time communication
- Canvas API for drawing
- iconfont for icons

### Backend
- Node.js runtime
- Koa2 web framework
- Socket.IO for WebSocket communication
- CORS support for cross-origin requests

## Project Structure

```
canvasSketch/
├── canvas/                          # Frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── CanvasBoard.vue     # Main canvas component
│   │   │   └── CanvasBoard.css     # Canvas styles
│   │   ├── utils/
│   │   │   ├── canvasDrawing.js    # Drawing utilities
│   │   │   └── websocket.js        # WebSocket client
│   │   ├── assets/
│   │   │   └── iconfont.css        # Icon fonts
│   │   ├── App.vue                 # Root component
│   │   └── main.js                 # Entry point
│   ├── package.json
│   └── vite.config.js
│
└── server/                          # Backend application
    ├── src/
    │   ├── app.js                  # Koa application entry
    │   ├── config.js               # Configuration
    │   └── websocket.js            # WebSocket server
    ├── package.json
    └── .env.example                # Environment variables example
```

## Installation

### Prerequisites

- Node.js 14.0 or higher
- npm or yarn package manager

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The server will start on http://localhost:3000

### Frontend Setup

1. Navigate to the canvas directory:
```bash
cd canvas
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:5174 (or the next available port if 5173 is in use)

## Usage

### Basic Drawing

1. Open the application in your web browser
2. Select a drawing tool (Brush or Eraser) from the toolbar
3. Choose a color using the color picker
4. Adjust the brush/eraser size using the size slider
5. Draw on the canvas by clicking and dragging

### Multi-user Collaboration

1. Open the application in multiple browser windows or tabs
2. Start drawing in one window - the drawing will appear in real-time in all other windows
3. All users can draw simultaneously
4. The online user count is displayed in the status indicator

### Canvas Operations

- Clear Canvas: Click the clear button to remove all drawings
- Save Drawing: Click the save button to download the canvas as an image
- Load Background: Click the background button to add a background image
- Full Screen: Click the full-screen button for full-screen drawing mode
- Mobile Mode: Click the mobile mode button for touch-friendly interface

### Drawing Styles

Select different drawing styles from the style dropdown:
- Solid: Continuous line
- Dashed: Dashed line pattern
- Dotted: Dotted line pattern

## Development

### Project Dependencies

#### Frontend
- vue: ^3.3.0
- socket.io-client: ^4.8.1
- vite: ^5.0.0

#### Backend
- koa: ^2.14.0
- @koa/cors: ^5.0.0
- socket.io: ^4.8.1

### WebSocket Events

The application uses the following WebSocket events for real-time synchronization:

- `draw:stroke`: Send/receive drawing stroke data
- `draw:clear`: Clear canvas on all clients
- `user:join`: User joins the session
- `user:leave`: User leaves the session
- `user:count`: Update online user count
- `sync:request`: Request canvas state synchronization
- `sync:state`: Receive canvas state

### CORS Configuration

The backend is configured to accept requests from:
- http://localhost:5173
- http://localhost:5174

Modify the CORS settings in `server/src/config.js` if needed.

## Browser Support

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Considerations

- The application is optimized for up to 10 concurrent users
- Drawing data is transmitted in real-time with minimal latency
- Canvas state is synchronized when new users join
- Automatic reconnection on connection loss

## Troubleshooting

### WebSocket Connection Failed
- Ensure the backend server is running on port 3000
- Check firewall settings to allow port 3000
- Verify CORS configuration in server/src/config.js

### Drawing Not Syncing
- Check browser console for errors
- Verify WebSocket connection status in the status indicator
- Refresh the page and try again

### Port Already in Use
- The frontend will automatically try the next available port
- To use a specific port, modify vite.config.js

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

