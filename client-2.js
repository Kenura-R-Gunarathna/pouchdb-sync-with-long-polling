const PouchDB = require('pouchdb');
const fetch = require('node-fetch'); // Or use the built-in fetch in Node.js 18+

const API_URL = 'http://localhost:3000/api';
const SYNC_URL = 'http://localhost:3001/db/mydb';
const DB_NAME = './client-2-data';

class PouchDBClient {
  constructor() {
    this.db = new PouchDB(DB_NAME);
    this.initSync();
  }

  // Initialize PouchDB synchronization
  initSync() {
    const remoteDB = new PouchDB(SYNC_URL);

    this.db.sync(remoteDB, {
      live: true,
      retry: true
    }).on('change', (change) => {
      console.log('🔄 Data has changed:', change);
    }).on('paused', (info) => {
      console.log('🔄 Sync paused:', info);
    }).on('active', () => {
      console.log('🔄 Sync is active');
    }).on('denied', (err) => {
      console.error('🚫 Sync denied:', err);
    }).on('complete', (info) => {
      console.log('✅ Sync complete:', info);
    }).on('error', (err) => {
      console.error('❌ Sync error:', err);
    });
  }

  // --- CRUD Operations using the Hono REST API ---

  // Get all documents
  async getAllDocs() {
    try {
      const response = await fetch(`${API_URL}/docs`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching all documents:', error);
      throw error;
    }
  }

  // Get a single document by ID
  async getDoc(id) {
    try {
      const response = await fetch(`${API_URL}/docs/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching document with id ${id}:`, error);
      throw error;
    }
  }

  // Create a new document
  async createDoc(doc) {
    try {
      const response = await fetch(`${API_URL}/docs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(doc)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  // Update a document
  async updateDoc(id, doc) {
    try {
      const response = await fetch(`${API_URL}/docs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(doc)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error updating document with id ${id}:`, error);
      throw error;
    }
  }

  // Delete a document
  async deleteDoc(id) {
    try {
      const response = await fetch(`${API_URL}/docs/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error deleting document with id ${id}:`, error);
      throw error;
    }
  }
}

// --- Example Usage ---

async function main() {
  const client = new PouchDBClient();

  try {
    // --- Interact with the local PouchDB instance (changes will sync) ---
    console.log('--- Interacting with Local PouchDB ---');

    // Create a document locally
    const localDoc = await client.db.post({
      title: 'Local Doc',
      content: 'This was created locally and will sync.'
    });
    console.log('Created local doc:', localDoc);

    // --- Interact with the Hono REST API ---
    console.log('\n--- Interacting with Hono REST API ---');

    // Create a document via the API
    const newDoc = await client.createDoc({ title: 'My New Document', content: 'Hello from the client!' });
    console.log('Created new document via API:', newDoc);

    // Get all documents via the API
    const allDocs = await client.getAllDocs();
    console.log('All documents from API:', allDocs.docs);

    // Get a single document by its ID via the API
    const singleDoc = await client.getDoc(newDoc.id);
    console.log('Fetched single document by ID via API:', singleDoc);

    // Update a document via the API
    const updatedDoc = await client.updateDoc(newDoc.id, { title: 'Updated Title', content: singleDoc.content });
    console.log('Updated document via API:', updatedDoc);

    // Delete a document via the API
    // const deletedDoc = await client.deleteDoc(newDoc.id);
    // console.log('Deleted document via API:', deletedDoc);

  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

main();