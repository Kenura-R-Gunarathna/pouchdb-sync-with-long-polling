// --- CONFIG ---
const SYNC_URL = 'http://localhost:3001/db/mydb';
const DB_NAME = '../client-1-data';

const output = document.getElementById('output');
const log = (...args) => {
  console.log(...args);
  output.textContent += args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : a).join(' ') + '\n';
};

// --- Local DB ---
const db = new PouchDB(DB_NAME);

// --- Sync ---
const remoteDB = new PouchDB(SYNC_URL);
db.sync(remoteDB, { live: true, retry: true })
  .on('change', info => log('🔄 Data changed:', info))
  .on('paused', info => log('⏸️ Sync paused:', info))
  .on('active', () => log('▶️ Sync active'))
  .on('error', err => log('❌ Sync error:', err));

db.replicate.from(remoteDB).on('complete', info => log('Initial pull complete', info))
  .on('error', err => log('Replication error', err));

// --- CRUD using local PouchDB ---
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

// --- Example buttons ---
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
