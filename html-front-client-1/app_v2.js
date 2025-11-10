// html-front-client-1\app_v2.js

// --- CONFIG ---
// UPDATE to the single server port
const SERVER_URL = 'http://localhost:3000';
const SYNC_URL = `${SERVER_URL}/db/mydb`;
const DB_NAME = '../client-1-data';

const output = document.getElementById('output');
const log = (...args) => {
  console.log(...args);
  const text = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : a).join(' ');
  output.textContent = text + '\n' + output.textContent; // Prepend new logs
};

// --- Socket.IO Client ---
log('Attempting to connect to Socket.IO server...');
const socket = io(SERVER_URL);

socket.on('connect', () => {
  log('✅ Connected to Socket.IO server!');
});

socket.on('database_change', (change) => {
  // This is a PUSH notification from the server, independent of PouchDB sync.
  // Useful for triggering real-time UI events that don't need the full doc.
  log('SOCKET.IO MSG: A change happened!', change.id);
});

socket.on('connect_error', (err) => {
  log('❌ Socket.IO connection error:', err.message);
});

// --- Local DB ---
const db = new PouchDB(DB_NAME);

// --- PouchDB Sync ---
const remoteDB = new PouchDB(SYNC_URL);
db.sync(remoteDB, { live: true, retry: true })
  .on('change', info => log('POUCHDB SYNC: Data changed:', info.direction, info.change.docs.length, 'docs'))
  .on('paused', () => log('POUCHDB SYNC: Paused'))
  .on('active', () => log('POUCHDB SYNC: Active'))
  .on('error', err => log('❌ POUCHDB SYNC error:', err));

// --- CRUD functions (same as before) ---
async function getAllDocs() {
  const res = await db.allDocs({ include_docs: true });
  const docs = res.rows.map(r => r.doc);
  log('All docs:', docs);
  return docs;
}

async function getDoc(id) {
  try {
    const doc = await db.get(id);
    log('Fetched doc:', doc);
    return doc;
  } catch (err) {
    log('⚠️ Doc not found:', id);
  }
}

async function createDoc(doc) {
  const _id = new Date().toISOString();
  const res = await db.put({ ...doc, _id });
  log('Created doc locally:', res);
  return { ...doc, _id };
}

async function updateDoc(id, fields) {
  try {
    const doc = await db.get(id);
    const res = await db.put({ ...doc, ...fields });
    log('Updated doc locally:', res);
  } catch (err) {
    log('⚠️ Update failed:', err);
  }
}

async function deleteDoc(id) {
  try {
    const doc = await db.get(id);
    const res = await db.remove(doc);
    log('Deleted doc locally:', res);
  } catch (err) {
    log('⚠️ Delete failed:', err);
  }
}

// --- Example buttons (same as before) ---
let lastCreatedId = null;

document.getElementById('btnCreate').onclick = async () => {
  const doc = await createDoc({
    title: 'My Web Doc',
    content: 'Created from the browser at ' + new Date().toISOString()
  });
  lastCreatedId = doc._id;
};

document.getElementById('btnReadAll').onclick = async () => {
  await getAllDocs();
};

document.getElementById('btnReadOne').onclick = async () => {
  if (!lastCreatedId) return log('⚠️ No document created yet!');
  await getDoc(lastCreatedId);
};

document.getElementById('btnUpdate').onclick = async () => {
  if (!lastCreatedId) return log('⚠️ No document created yet!');
  await updateDoc(lastCreatedId, {
    title: 'Updated Title',
    content: 'Updated at ' + new Date().toLocaleTimeString()
  });
};

document.getElementById('btnDelete').onclick = async () => {
  if (!lastCreatedId) return log('⚠️ No document created yet!');
  await deleteDoc(lastCreatedId);
  lastCreatedId = null;
};
