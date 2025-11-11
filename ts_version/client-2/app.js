// client-2/app.js

// --- CONFIG ---
const SERVER_URL = 'http://localhost:3000';
const SYNC_URL = `${SERVER_URL}/db/mydb`;
const DB_NAME = './client-data';

const output = document.getElementById('output');
const log = (...args) => {
  console.log(...args);
  const text = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : a).join(' ');
  output.textContent = text + '\n' + output.textContent;
};

// --- Socket.IO Client ---
log('Connecting to Socket.IO...');
const socket = io(SERVER_URL);
socket.on('connect', () => log('✅ Connected to Socket.IO!'));
socket.on('database_change', (change) => log('SOCKET.IO MSG: Change detected!', change.id));
socket.on('connect_error', (err) => log('❌ Socket.IO error:', err.message));

// --- Local DB & Sync ---
const db = new PouchDB(DB_NAME);
const remoteDB = new PouchDB(SYNC_URL);

db.sync(remoteDB, { live: true, retry: true })
  .on('change', info => log('POUCHDB SYNC: Data changed:', info.direction))
  .on('error', err => log('❌ POUCHDB SYNC error:', err));

// --- Generic CRUD Functions ---
async function createDoc(doc) {
  try {
    // The server will add the 'type' and 'createdAt' fields.
    // PouchDB's post() will add the '_id'.
    const res = await db.post(doc);
    log('Created doc locally:', res);
    return res.id; // Return the new ID
  } catch (err) {
    log('⚠️ Create failed:', err);
    return null;
  }
}

async function getAllDocs() {
  const res = await db.allDocs({ include_docs: true });
  const docs = res.rows.map(r => r.doc);
  log('All local docs:', docs);
  return docs;
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

// --- UI Event Handlers ---
let lastCreatedId = null;

document.getElementById('btnCreateStudent').onclick = async () => {
  const student = {
    type: 'student', // We must include the type
    id: 'student_' + Date.now(),
    name: 'John Doe',
    grade: 10,
    createdAt: new Date().toISOString()
  };
  lastCreatedId = await createDoc(student);
};

document.getElementById('btnCreateTeacher').onclick = async () => {
  const teacher = {
    type: 'teacher', // We must include the type
    id: 'teacher_' + Date.now(),
    name: 'Jane Smith',
    subject: 'Mathematics',
    createdAt: new Date().toISOString()
  };
  lastCreatedId = await createDoc(teacher);
};

document.getElementById('btnReadAll').onclick = getAllDocs;

document.getElementById('btnDeleteLast').onclick = async () => {
  if (!lastCreatedId) return log('⚠️ No document created yet!');
  await deleteDoc(lastCreatedId);
  lastCreatedId = null;
};