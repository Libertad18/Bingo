const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {};

io.on("connection", socket => {
  socket.on("joinRoom", roomId => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = { players: [], started: false };
    }
    rooms[roomId].players.push(socket.id);

    if (!rooms[roomId].started && rooms[roomId].players.length >= 2) {
      rooms[roomId].started = true;
      io.to(roomId).emit("startCountdown");
    }

    io.to(roomId).emit("playerList", rooms[roomId].players);
  });

  socket.on("sendMessage", ({ roomId, username, avatar, message }) => {
    io.to(roomId).emit("chatMessage", { username, avatar, message });
  });

  socket.on("playerWin", roomId => {
    io.to(roomId).emit("announceWinner");
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter(id => id !== socket.id);
      io.to(roomId).emit("playerList", rooms[roomId].players);
    }
  });
});

server.listen(3000, () => {
  console.log("Aman Bingo backend running on port 3000");
});
