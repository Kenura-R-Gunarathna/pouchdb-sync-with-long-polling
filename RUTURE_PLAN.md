Excellent choice. Integrating TypeScript and using a schema-first approach, even with a schemaless database like PouchDB, brings significant benefits in terms of code quality, maintainability, and developer experience.

While the schemas you provided are in `RxDB` format, we can adapt their structure for our PouchDB-centric Express server. We'll use TypeScript interfaces to enforce the data shapes within our application code. The primary key and relation (`ref`) properties will be handled by our application logic rather than a database enforcement layer.

Here is the complete, refactored project with TypeScript support.

### Project Structure

First, let's organize the project files for a TypeScript environment.

```
/project-root
├── /html-front-client-1
│   ├── index.html
│   ├── pouchdb.min.js
│   ├── socket.io.min.js
│   └── app.js         // (This will be compiled from app.ts)
│
├── /src
│   ├── /routes
│   │   └── genericRouter.ts
│   ├── schemas.ts
│   └── server.ts
│
├── package.json
└── tsconfig.json```

### 1. Setup and Configuration

**`package.json`**

You'll need to install several new development dependencies for TypeScript support.

```json
{
  "name": "pouchdb-ts-server",
  "version": "1.0.0",
  "description": "PouchDB server with TypeScript and multiple schemas",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "express-pouchdb": "^4.2.0",
    "pouchdb": "^7.3.0",
    "socket.io": "^4.5.4"
  },
  "devDependencies": {
    "@types/cors": "^2.8.12",
    "@types/express": "^4.17.14",
    "@types/node": "^18.11.9",
    "@types/pouchdb": "^6.4.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^4.8.4"
  }
}
```

**To install, run:**
`npm install`

**`tsconfig.json`**

This file configures the TypeScript compiler.

```json
{
  "compilerOptions": {
    "target": "es6",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

### 2. Server-Side TypeScript Code

**`src/schemas.ts`**

Here we define the TypeScript interfaces based on your schemas. These interfaces will give us autocompletion and type-checking in our code.

```typescript
// src/schemas.ts

// We add PouchDB's _id and _rev fields to our base document types
export interface PouchDBDocument {
    _id?: string;
    _rev?: string;
}

// We add a 'type' field to distinguish between our different schemas
export interface TypedDocument extends PouchDBDocument {
    type: 'user' | 'teacher' | 'student' | 'class';
    createdAt?: string;
    updatedAt?: string;
}

export interface User extends TypedDocument {
    type: 'user';
    username: string;
    password?: string; // Password should ideally be hashed and not sent to client
}

export interface Teacher extends TypedDocument {
    type: 'teacher';
    id: string; // This will be the primary key, often same as _id
    name: string;
    subject: string;
}

export interface Student extends TypedDocument {
    type: 'student';
    id: string;
    name: string;
    grade: number;
}

export interface Class extends TypedDocument {
    type: 'class';
    id: string;
    name: string;
    teacherId: string; // Corresponds to a Teacher's 'id'
    studentIds: string[]; // Corresponds to a list of Student 'id's
}

// A union type for any possible document in our DB
export type AnyDocument = User | Teacher | Student | Class;
```

**`src/routes/genericRouter.ts`**

The generic router is now strongly typed. It ensures that when you create a `student`, the request body must match the `Student` interface.

```typescript
// src/routes/genericRouter.ts

import express, { Router, Request, Response } from 'express';
import PouchDB from 'pouchdb';
import { AnyDocument, TypedDocument } from '../schemas';

// The factory function now accepts a document type string
export const createRouter = (db: PouchDB.Database, type: TypedDocument['type']): Router => {
    const router = Router();

    // GET all documents of a specific type
    router.get('/', async (req: Request, res: Response) => {
        try {
            const result = await db.allDocs<AnyDocument>({ include_docs: true });
            const docs = result.rows
                .map(r => r.doc)
                .filter(doc => doc && doc.type === type);
            res.json(docs);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST (Create) a new document
    router.post('/', async (req: Request, res: Response) => {
        try {
            // The body is expected to be a partial document, we add the rest
            const newDoc: AnyDocument = {
                ...req.body,
                type: type, // Set the type for this router
                createdAt: new Date().toISOString(),
            };
            // PouchDB's post will generate the _id
            const result = await db.post(newDoc);
            res.status(201).json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });
    
    // PUT (Update) a document by ID
    router.put('/:id', async (req: Request, res: Response) => {
        try {
            const docId = req.params.id;
            const doc = await db.get<AnyDocument>(docId);

            if (doc.type !== type) {
                return res.status(403).json({ error: `Cannot update: Document is not a ${type}` });
            }

            const updatedDoc: AnyDocument = {
                ...doc, // Keep _id, _rev, and type
                ...req.body, // Apply updates from request body
                updatedAt: new Date().toISOString(),
            };

            const result = await db.put(updatedDoc);
            res.json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE a document by ID
    router.delete('/:id', async (req: Request, res: Response) => {
        try {
            const doc = await db.get(req.params.id);
             if ((doc as any).type !== type) {
                return res.status(403).json({ error: `Cannot delete: Document is not a ${type}` });
            }
            const result = await db.remove(doc);
            res.json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });


    return router;
};
```

**`src/server.ts`**

The main server file is almost identical to the JavaScript version, but with TypeScript imports and type annotations.

```typescript
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
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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
const io = new Server(server, { cors: { origin: "*" } });

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
```

### 3. Client-Side Code

The client-side code remains largely the same since it interacts with PouchDB's generic API. The key is that the *data it sends* must now conform to the schemas. We'll update the button clicks to create different types of documents.

**`html-front-client-1/index.html`**

We add more buttons to demonstrate creating different document types.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>User 1 | PouchDB Client App</title>
  <script src="socket.io.min.js"></script>
  <script src="pouchdb.min.js"></script>
  <script defer src="app_v2.js"></script>
  <style>
    body { font-family: sans-serif; margin: 20px; }
    button { margin: 5px; padding: 10px; cursor: pointer; }
    pre { background: #eee; padding: 10px; max-height: 400px; overflow: auto; }
  </style>
</head>
<body>
  <h1>PouchDB Multi-Schema Demo</h1>

  <div>
    <button id="btnCreateStudent">Create Student</button>
    <button id="btnCreateTeacher">Create Teacher</button>
    <button id="btnReadAll">Get All Docs (from local DB)</button>
    <button id="btnDeleteLast">Delete Last Created</button>
  </div>

  <h3>Console Output:</h3>
  <pre id="output"></pre>
</body>
</html>
```

**`html-front-client-1/app_v2.js`**

This is the updated client logic. It's still plain JavaScript, but it now creates structured data.

```javascript
// html-front-client-1/app_v2.js

// --- CONFIG ---
const SERVER_URL = 'http://localhost:3000';
const SYNC_URL = `${SERVER_URL}/db/mydb`;
const DB_NAME = '../client-1-data';

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
```

### How to Run

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Build the TypeScript Server:**
    ```bash
    npm run build
    ```
    This compiles everything from `/src` into JavaScript in the `/dist` directory.
3.  **Run the Server:**
    You can use the development server which automatically restarts on changes:
    ```bash
    npm run dev
    ```
    Or run the compiled production code:
    ```bash
    npm start
    ```
4.  **Open the Client:**
    Open the `html-front-client-1/index.html` file in your web browser.

Now, when you click "Create Student" or "Create Teacher," the client will create a typed document in its local PouchDB, which will then sync to the server. The server's typed router will correctly handle the incoming data.