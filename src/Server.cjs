const express = require('express');
const app = express();
const path = require('path');
const http = require('http').createServer(app);
const cors = require('cors');

app.use(cors());

const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST']
  }
});

const port = 5500;
const clients = {};
const names = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Register new user
  socket.on('register', (name) => {
    clients[socket.id] = { name, socket };
    names[name] = socket.id;
    console.log(`${name} registered with id ${socket.id}`);
    console.log("=== Current Connected Users ===");
console.log(Object.values(clients).map((c) => c.name));
console.log("===============================");

    BroadcastClients();
  });

  // WebRTC Signaling
  socket.on('signal', ({ to, data }) => {
    const targetSocketId = names[to];
    if (targetSocketId && clients[targetSocketId]) {
      clients[targetSocketId].socket.emit('signal', {
        from: clients[socket.id].name,
        data,
      });
    }
  });

//messaging
// Missing message forward handler
// Message forwarding handler (missing in your code)
socket.on("send:message", ({ to, text, timestamp }) => {
  const from = clients[socket.id]?.name;
  const targetSocketId = names[to];

  console.log(`Message from ${from} to ${to}: ${text}`);

  if (from && targetSocketId && clients[targetSocketId]) {
    clients[targetSocketId].socket.emit("receive:message", {
      from,
      text,
      timestamp,
    });
  } else {
    console.warn("Failed to deliver message. Either sender or receiver is missing.");
  }
});





  // Handle disconnect
  socket.on('disconnect', () => {
    if (clients[socket.id]) {
      console.log(`${clients[socket.id].name} disconnected`);
      delete names[clients[socket.id].name];
      delete clients[socket.id];
      BroadcastClients();
    }
  });

  // Broadcast updated client list
  function BroadcastClients() {
    const clientList = Object.entries(clients).map(([id, client]) => ({
      id,
      name: client.name,
    }));
    console.log('Broadcasting clients:', clientList);
    io.emit('clients', clientList);
  }
});

http.listen(port, () => {
  console.log("Server is running on port", port);
});
