// src/server.ts

import http from 'http';
import express from 'express';
import cors from 'cors';
import PouchDB from 'pouchdb';
import expressPouchDB from 'express-pouchdb';
import { Server } from 'socket.io';
import { createRouter } from './routes/genericRouter';

const PORT = 3000;
const SERVER_URL = `http://localhost:${PORT}`;

// --- 1. Create the Express App and Database ---
const app = express();
const db = new PouchDB('./server-data');

// --- 2. Define CORS Policy ---
const allowedOrigins = ['http://localhost:2001', 'http://localhost:2002', 'http://localhost:2003'];
const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true // <-- THIS IS THE MOST CRITICAL PART
};

// --- 3. Apply Middleware ---
app.use(cors(corsOptions));
app.use(express.json());

// --- 4. Mount PouchDB Sync Endpoint ---
app.use('/db', expressPouchDB(PouchDB, { mode: 'minimumForPouchDB' }));

// --- 5. Mount the REST API Routers ---
app.use('/api/users', createRouter(db, 'user'));
app.use('/api/teachers', createRouter(db, 'teacher'));
app.use('/api/students', createRouter(db, 'student'));
app.use('/api/classes', createRouter(db, 'class'));

// --- 6. Create HTTP Server and Socket.IO ---
const server = http.createServer(app);
// Socket.IO needs its own CORS configuration
const io = new Server(server, { 
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    } 
});

io.on('connection', (socket) => {
    console.log('🔌 A client connected via Socket.IO');
    socket.on('disconnect', () => console.log('👋 A client disconnected'));
});

// --- 7. Listen to DB changes ---
db.changes({
    since: 'now',
    live: true,
    include_docs: false
}).on('change', (change) => {
    console.log(`📢 Database change on doc [${change.id}], broadcasting...`);
    io.emit('database_change', change);
}).on('error', (err) => {
    console.error('❌ Error in PouchDB changes feed:', err);
});

// --- 8. Start the Server ---
server.listen(PORT, () => {
    console.log(`🚀 Express Server running on ${SERVER_URL}`);
    console.log(` PouchDB Sync endpoint: ${SERVER_URL}/db/mydb`);
    console.log(' REST API endpoints: /api/users, /api/teachers, /api/students, /api/classes');
});
