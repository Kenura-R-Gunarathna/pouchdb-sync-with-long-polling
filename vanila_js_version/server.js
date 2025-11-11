// server.js - PouchDB sync server with Hono

const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const { cors } = require('hono/cors');
const PouchDB = require('pouchdb');
const expressPouchDB = require('express-pouchdb');

const app = new Hono();
const PORT = 3000;

// Enable CORS
app.use('/*', cors());

// Create PouchDB database
const db = new PouchDB('./server-data');

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok',
    database: './server-data',
    timestamp: new Date().toISOString()
  });
});

// Get all documents
app.get('/api/docs', async (c) => {
  try {
    const result = await db.allDocs({ include_docs: true });
    return c.json({
      total: result.rows.length,
      docs: result.rows.map(r => r.doc)
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Get single document
app.get('/api/docs/:id', async (c) => {
  try {
    const doc = await db.get(c.req.param('id'), { 
      attachments: true,
      binary: true 
    });
    return c.json(doc);
  } catch (err) {
    return c.json({ error: err.message }, 404);
  }
});

// Create document
app.post('/api/docs', async (c) => {
  try {
    const body = await c.req.json();
    const result = await db.post({
      ...body,
      createdAt: new Date().toISOString()
    });
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Update document
app.put('/api/docs/:id', async (c) => {
  try {
    const body = await c.req.json();
    const doc = await db.get(c.req.param('id'));
    const result = await db.put({
      ...body,
      _id: doc._id,
      _rev: doc._rev,
      updatedAt: new Date().toISOString()
    });
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Delete document
app.delete('/api/docs/:id', async (c) => {
  try {
    const doc = await db.get(c.req.param('id'));
    const result = await db.remove(doc);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

console.log('🚀 Starting Hono + PouchDB Server...');

// For PouchDB replication, we need to use express-pouchdb middleware
// Hono doesn't directly support Express middleware, so we create a hybrid approach
const express = require('express');
const express_cors = require('cors');

const expressApp = express();

expressApp.use(express_cors({
  origin: ['http://localhost:3000', 'http://localhost:2001', 'http://localhost:2002', 'http://localhost:2003'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Mount express-pouchdb for replication endpoints
expressApp.use('/db', expressPouchDB(PouchDB, {
  mode: 'minimumForPouchDB'
}));

// Start Express app for PouchDB sync on separate port
const SYNC_PORT = 3001;
expressApp.listen(SYNC_PORT, () => {
  console.log(`🔄 PouchDB Sync endpoint: http://localhost:${SYNC_PORT}/db/mydb`);
});

// Start Hono server for REST API
serve({
  fetch: app.fetch,
  port: PORT
}, (info) => {
  console.log(`🚀 Hono Server running on http://localhost:${info.port}`);
  console.log(`📊 Database location: ./server-data`);
  console.log(`\nAPI Endpoints:`);
  console.log(`  GET    /health`);
  console.log(`  GET    /api/docs`);
  console.log(`  GET    /api/docs/:id`);
  console.log(`  POST   /api/docs`);
  console.log(`  PUT    /api/docs/:id`);
  console.log(`  DELETE /api/docs/:id`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await db.close();
  process.exit(0);
});