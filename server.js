```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow connections from your frontend
    methods: ['GET', 'POST']
  }
});

// Serve static files (index.html, style.css, script.js)
app.use(express.static(path.join(__dirname, 'public')));

// Handle root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  socket.on('startGame', (roomId) => {
    console.log(`Game started in room: ${roomId}`);
    // You can add number calling logic here if server-driven
  });

  socket.on('numberCalled', (num) => {
    io.to(socket.rooms.values().next().value).emit('numberCalled', num);
  });

  socket.on('playerWin', (roomId) => {
    io.to(roomId).emit('announceWinner');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Use Render's assigned port or default to 3000 for local testing
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```
