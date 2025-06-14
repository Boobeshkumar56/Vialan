const express=require('express');
const app=express();
const path= require('path');
const http=require('http').createServer(app)
const cors=require('cors')
app.use(cors())
const io=require('socket.io')(http,{
    cors:{
        origin:"*",
        methods:['GET','POST']
    }
})
const port=5500
const clients = {};
const names = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register', (name) => {
    clients[socket.id] = { name, socket };
    names[name] = socket.id;
    console.log(`${name} registered with id ${socket.id}`);
    BroadcastClients();
  });

  socket.on('signal', ({ to, data }) => {
    const targetSocketId = names[to]; // ← now works with usernames
    if (targetSocketId && clients[targetSocketId]) {
      clients[targetSocketId].socket.emit('signal', {
        from: clients[socket.id].name, // send back name instead of socket.id
        data,
      });
    }
  });

  socket.on('disconnect', () => {
    if (clients[socket.id]) {
      console.log(`${clients[socket.id].name} disconnected`);
      delete names[clients[socket.id].name];
      delete clients[socket.id];
      BroadcastClients();
    }
  });

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
  console.log("server is running on port 5500");
});
