require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const redis = require('redis');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Config
const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const MAX_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 300;
const RATE_LIMIT_MS = 500; // 0.5 sec per user

// Redis client
const client = redis.createClient({ url: REDIS_URL });
client.connect()
  .then(() => console.log('Redis connected'))
  .catch(console.error);

// Serve static files
app.use(express.static('public'));

// Socket.io
io.on('connection', async (socket) => {
  console.log('A user connected:', socket.id);

  // Send last messages
  try {
    const messages = await client.lRange('chat_messages', 0, -1);
    messages.reverse().forEach(msg => socket.emit('chat message', JSON.parse(msg)));
  } catch (err) {
    console.error('Failed to load messages:', err);
  }

  socket.lastMsgTime = 0;

  socket.on('chat message', async (data) => {
    if (!data || !data.username || !data.text) return;

    const username = String(data.username).slice(0, 20); // limit username length
    const text = String(data.text).trim().slice(0, MAX_MESSAGE_LENGTH); // limit message length

    // Rate limiting
    const now = Date.now();
    if (now - socket.lastMsgTime < RATE_LIMIT_MS) return;
    socket.lastMsgTime = now;

    const message = {
      username,
      text,
      time: now
    };

    io.emit('chat message', message);

    try {
      await client.lPush('chat_messages', JSON.stringify(message));
      await client.lTrim('chat_messages', 0, MAX_MESSAGES - 1);
    } catch (err) {
      console.error('Redis write failed:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Listen on all interfaces (LAN accessible)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
