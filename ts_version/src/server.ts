// src/server.ts

import http from 'http';
import express from 'express';
import cors from 'cors';
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import expressPouchDB from 'express-pouchdb';
import { Server } from 'socket.io';

import { createUserRouter } from './routes/userRouter';
import { createTeacherRouter } from './routes/teacherRouter';
import { createStudentRouter } from './routes/studentRouter';
import { createClassRouter } from './routes/classRouter';
import { createAuthRouter } from './routes/auth';
import { authMiddleware } from './middleware/authMiddleware';

// Change this to 'couchdb' when you deploy against a real CouchDB
const DATABASE_STRATEGY: 'leveldb' | 'couchdb' = 'leveldb'; 

const PORT = 3000;
const SERVER_URL = `http://localhost:${PORT}`;

// --- 1. Create the Express App and Database ---
const app = express();

// --- NEW: Add the find plugin to PouchDB ---
PouchDB.plugin(PouchDBFind);

// Choose DB connection based on the strategy
// @ts-ignore
const db = DATABASE_STRATEGY === 'couchdb'
    ? new PouchDB('http://user:pass@localhost:5984/your-remote-db') // Example for CouchDB
    : new PouchDB('./server-data'); // Local LevelDB


// --- NEW: Create an index for efficient querying ---
// This code runs once on server startup to ensure the index exists.
db.createIndex({
    index: { fields: ['type'] }
}).then(() => {
    console.log('✅ Database index on "type" field is ready.');
}).catch(err => {
    console.error('❌ Error creating database index:', err);
});


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

// --- Mount Authentication Router (Public) ---
app.use('/api/auth', createAuthRouter(db)); // // This route does NOT have the authMiddleware because the user isn't logged in yet.
app.use('/db', authMiddleware, expressPouchDB(PouchDB, { mode: 'minimumForPouchDB' })); // Every request to the sync endpoint must now be authenticated.
app.use('/api/users', authMiddleware, createUserRouter(db));
app.use('/api/teachers', authMiddleware, createTeacherRouter(db));
app.use('/api/students', authMiddleware, createStudentRouter(db));
app.use('/api/classes', authMiddleware, createClassRouter(db));

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
