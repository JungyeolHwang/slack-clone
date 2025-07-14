import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { shardManager } from './config/shardManager';
import { setupSocketHandlers } from './socket/socketHandler';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', routes);

// Socket.IO handlers
setupSocketHandlers(io);

// Error handling
app.use(errorHandler);
app.use(notFoundHandler);

// 샤드 매니저 초기화
shardManager.initialize().then(() => {
  console.log('🗄️ ShardManager initialized successfully');
}).catch((error) => {
  console.error('❌ Failed to initialize ShardManager:', error);
});

export { app, server }; 