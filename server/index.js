import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { Low, MemorySync } from 'lowdb';

const adapter = new MemorySync();
const db = new Low(adapter);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000'
  }
});

const port = process.env.PORT||3001;
const room = 'staging';

db.data ||= { members: [] };

app.get('/api', (req, res) => {
  res.send({ message: 'Hello World! My name is Sam!' });
});

io.on('connection', async (socket) => {
  socket.join(room);
  socket.emit('loaded', db.data.members);

  socket.on('join', (name) => {
    socket.join(room);
    
    if (!db.data.members.length) {
      socket.emit('makeLeader');
    }

    db.data.members.push({ id: socket.id, name });

    socket.emit('joined', socket.id);
    io.emit('loaded', db.data.members);
  });

  socket.on('checkLeader', (leaderId) => {
    if (socket.id === leaderId) {
      socket.emit('makeLeader');
    }
  });

  socket.on('drawTeams', (drawData) => {
    socket.to(room).emit('teamsDrawn', drawData);
  });

  socket.on('disconnect', (reason) => {
    const userIndex = db.data.members.findIndex(x => x.id === socket.id);

    if (userIndex >= 0) {
      db.data.members.splice(userIndex, 1);
    }

    io.emit('loaded', db.data.members);

    if (db.data.members.length) {
      io.in(room).emit('askLeader', db.data.members[0].id);
    }
  });
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
