const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", socket => {
  socket.on("joinRoom", room => {
    socket.join(room);
  });

  socket.on("startGame", room => {
    let pool = Array.from({ length: 75 }, (_, i) => i + 1).sort(() => 0.5 - Math.random());
    let index = 0;
    const interval = setInterval(() => {
      if (index >= pool.length) return clearInterval(interval);
      io.to(room).emit("numberCalled", pool[index++]);
    }, 2000);
  });

  socket.on("playerWin", room => {
    io.to(room).emit("announceWinner");
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
