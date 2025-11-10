// server.js - Pure Express server for PouchDB sync, REST API, and Socket.IO

const http = require('http');
const express = require('express');
const cors = require('cors');
const PouchDB = require('pouchdb');
const expressPouchDB = require('express-pouchdb');
const { Server } = require('socket.io');

const PORT = 3000;
const SERVER_URL = `http://localhost:${PORT}`;

// --- 1. Create the Express App ---
const app = express();


// --- 1. Define a Strict, Reusable CORS Policy ---
// This is the configuration you correctly suggested.
const allowedOrigins = [
    'http://localhost:2001', 
    'http://localhost:2002', 
    'http://localhost:2003'
    // Add any other web client origins you might have
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, Postman, or Electron apps)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};


// --- 2. Apply Middleware with the new CORS policy ---
// Use the specific CORS options for all Express routes
app.use(cors(corsOptions));
app.use(express.json());

// --- 3. Mount the PouchDB Sync Endpoint ---
// All requests to /db will be handled by express-pouchdb
app.use('/db', expressPouchDB(PouchDB, {
  mode: 'minimumForPouchDB'
}));

// --- 4. Define the REST API Endpoints ---
const db = new PouchDB('./server-data');

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    database: './server-data',
    timestamp: new Date().toISOString()
  });
});

// Get all documents
app.get('/api/docs', async (req, res) => {
  try {
    const result = await db.allDocs({ include_docs: true });
    res.json({ docs: result.rows.map(r => r.doc) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single document
app.get('/api/docs/:id', async (req, res) => {
  try {
    const doc = await db.get(req.params.id);
    res.json(doc);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Create document
app.post('/api/docs', async (req, res) => {
  try {
    const result = await db.post({
      ...req.body,
      createdAt: new Date().toISOString()
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update document
app.put('/api/docs/:id', async (req, res) => {
  try {
    const doc = await db.get(req.params.id);
    const result = await db.put({
      ...req.body,
      _id: doc._id,
      _rev: doc._rev,
      updatedAt: new Date().toISOString()
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete document
app.delete('/api/docs/:id', async (req, res) => {
  try {
    const doc = await db.get(req.params.id);
    const result = await db.remove(doc);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- 5. Create HTTP Server and Attach Socket.IO ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Be more specific in production
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('🔌 A client connected via Socket.IO');
  socket.on('disconnect', () => {
    console.log('👋 A client disconnected');
  });
});

// --- 6. Listen to DB changes and broadcast via Socket.IO ---
db.changes({
  since: 'now',
  live: true,
  include_docs: false // No need to send the full doc, just the notification
}).on('change', (change) => {
  console.log(`📢 Database change on doc [${change.id}], broadcasting...`);
  io.emit('database_change', change); // Send the change info to all clients
}).on('error', (err) => {
  console.error('❌ Error in PouchDB changes feed:', err);
});


// --- 7. Start the Server ---
server.listen(PORT, () => {
  console.log(`🚀 Express Server running on ${SERVER_URL}`);
  console.log(` REST API endpoint: ${SERVER_URL}/api/...`);
  console.log(` PouchDB Sync endpoint: ${SERVER_URL}/db/mydb`);
  console.log(` Socket.IO is listening for connections.`);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await db.close();
  server.close(() => {
    process.exit(0);
  });
});