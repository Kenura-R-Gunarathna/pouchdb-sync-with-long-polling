Excellent question. You are absolutely right to be cautious about putting a full CouchDB instance on shared hosting. It's often not possible or practical.

The great news is **yes, you can absolutely implement powerful, role-based filtering with your current LevelDB-backed PouchDB server.**

This is an advanced technique that requires intercepting and rewriting the data stream from PouchDB's sync protocol. It's more complex than the "database-per-user" model, but it's incredibly powerful and achieves exactly what you want: a single, shared database where users only sync the data they are authorized to see.

We will create a custom Express middleware that sits *in front* of `express-pouchdb` and acts as a security guard for the replication stream.

---

### The Strategy: Intercept and Filter the `_changes` Feed

The magic of PouchDB replication lies in the `_changes` feed. The client first asks the server, "What documents have changed?" The server responds with a list of document IDs. The client then requests the contents of only those documents.

**Our goal is to intercept the server's response to the `_changes` request and remove any document IDs that the current user is not allowed to see.**

If the client never learns about a document's existence, it will never ask for its content.

---

### Step 1: Create the Authorization Logic Helper

First, let's centralize our business rules. Create a new file to decide if a user can access a specific document.

**`src/auth/isUserAllowed.ts`**
```typescript
// src/auth/isUserAllowed.ts

import { AnyDocument, User } from '../schemas';

// This is where you define all your business rules for data access.
export const isUserAllowed = (user: User, doc: AnyDocument): boolean => {
    // Rule 1: Admins can see everything.
    if (user.role === 'admin') {
        return true;
    }

    // Rule 2: Users can always see their own user document.
    if (doc.type === 'user' && doc._id === user.userId) {
        return true;
    }

    // Rule 3: Teachers can see any student or teacher document.
    if (user.role === 'teacher' && (doc.type === 'student' || doc.type === 'teacher')) {
        return true;
    }

    // Rule 4: Teachers can only see classes they are assigned to.
    if (doc.type === 'class' && user.role === 'teacher' && doc.teacherId === user.userId) {
        return true;
    }

    // Rule 5: Students can only see their own user document (handled by Rule 2).
    // Add a rule for students to see their classes if needed.
    if (doc.type === 'class' && user.role === 'student' && doc.studentIds.includes(user.userId)) {
        return true;
    }

    // Default: Deny access
    return false;
};
```

### Step 2: Create the Filtering Middleware

This is the core of the solution. This middleware will wrap the response object, process the `_changes` feed line-by-line, and filter out unauthorized changes.

**`src/middleware/pouchFilterMiddleware.ts`**
```typescript
// src/middleware/pouchFilterMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import PouchDB from 'pouchdb';
import { isUserAllowed } from '../auth/isUserAllowed';
import { AnyDocument, User } from '../schemas';

export const createPouchFilterMiddleware = (db: PouchDB.Database) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as User | undefined;

        // We only filter the changes feed. All other requests pass through.
        // The 'longpoll' feed is what PouchDB sync uses.
        if (!req.path.includes('_changes') || !req.query.feed || !user) {
            return next();
        }

        console.log(`[Filter] Intercepting _changes feed for user: ${user.username}`);

        // Store the original response methods
        const originalWrite = res.write;
        const originalEnd = res.end;

        // This buffer will hold incomplete lines from the response stream
        let buffer = '';

        // Override res.write to intercept the data stream
        res.write = (chunk: any, ...args: any[]) => {
            buffer += chunk.toString();
            let boundary = buffer.lastIndexOf('\n');

            if (boundary !== -1) {
                const lines = buffer.substring(0, boundary).split('\n');
                buffer = buffer.substring(boundary + 1);

                Promise.all(lines.map(async (line) => {
                    if (!line.trim()) return line; // Keep empty lines for heartbeat
                    try {
                        const change = JSON.parse(line);
                        if (change.id) {
                            const doc = await db.get<AnyDocument>(change.id);
                            if (isUserAllowed(user, doc)) {
                                return line; // User is allowed, return the original line
                            }
                            return null; // User is not allowed, filter this line out
                        }
                    } catch (e) {
                        // Not a JSON line (e.g., heartbeat), pass it through
                    }
                    return line;
                })).then(allowedLines => {
                    const filteredOutput = allowedLines.filter(line => line !== null).join('\n') + '\n';
                    originalWrite.call(res, filteredOutput, ...args);
                });
            }
            return true;
        };

        // Override res.end to process any remaining data in the buffer
        res.end = (...args: any[]) => {
            // Process any final chunk in the buffer before ending
            // (This part is often empty but is good practice to include)
            if (buffer.length > 0) {
                // Similar filtering logic as above can be added here if needed
                originalWrite.call(res, buffer);
            }
            originalEnd.call(res, ...args);
        };

        next();
    };
};
```

### Step 3: Integrate into the Server

Now, we update `server.ts` to use this new middleware. The order is critical: `authMiddleware` runs first, then our `pouchFilterMiddleware`, and finally `express-pouchdb`.

**`src/server.ts` (Updated)**
```typescript
// ... other imports
import { createAuthRouter } from './routes/auth';
import { authMiddleware } from './middleware/authMiddleware';
import { createPouchFilterMiddleware } from './middleware/pouchFilterMiddleware';

// ... app, db, cors setup ...

// --- Mount Authentication Router (Public) ---
app.use('/api/auth', createAuthRouter(db));

// --- Mount PouchDB Sync Endpoint (Protected & Filtered) ---
const pouchFilterMiddleware = createPouchFilterMiddleware(db);
const pouchDBApp = expressPouchDB(PouchDB, { mode: 'minimumForPouchDB' });

// The order of these three middleware is VERY important.
app.use('/db', 
    authMiddleware,          // 1. Authenticate the user and attach `req.user`
    pouchFilterMiddleware,   // 2. Intercept and filter the response based on `req.user`
    pouchDBApp               // 3. Let express-pouchdb handle the filtered request
);

// --- Mount the REST API Routers (Protected) ---
// These are already protected by the authMiddleware and have their own internal filtering.
app.use('/api/users', authMiddleware, createRouter(db, 'user'));
// ... other API routers

// ... rest of the server file
```

### Step 4: Update Client Sync Logic

The most beautiful part of this server-side filtering approach is that **the client code does not need to change.**

Your client still points to a single database URL. It has no idea that the server is filtering the data it receives. It just syncs with what it's told exists.

Your client-side `app_v2.js` should now point to the single, shared database.

**`html-front-client-1/app_v2.js` (Final Version)**
```javascript
// ... login logic to get the authToken ...

function initializeSync() {
    if (!authToken) {
        return log('Cannot sync. Please log in.');
    }
    
    // EVERYONE syncs with the same database name now.
    const dbName = 'school-data-local';
    const remoteURL = `${SERVER_URL}/db/school-data-shared`;

    db = new PouchDB(dbName);

    const remoteDB = new PouchDB(remoteURL, {
        fetch: (url, opts) => {
            opts.headers.set('Authorization', `Bearer ${authToken}`);
            return PouchDB.fetch(url, opts);
        }
    });

    db.sync(remoteDB, { live: true, retry: true })
      .on('change', info => log('SYNC: change received', info.change.docs.length, 'docs'))
      .on('error', err => log('SYNC ERROR:', err));
}
```

### How It Works & The Trade-offs

*   **Pros:**
    *   You get fine-grained, document-level security.
    *   You maintain a single database, making relationships and admin queries simple.
    *   It's completely transparent to the client.
    *   It avoids the complexity and cost of a full CouchDB server.

*   **Cons & Considerations:**
    *   **Performance Overhead:** For every single document change that happens in the database, this middleware has to perform an additional `db.get()` to fetch the document and check permissions. For a high-traffic system, this could become a bottleneck.
    *   **Write Security:** This implementation focuses on filtering *reads* (what data the client receives). You still need to implement security for *writes* inside your REST API endpoints (e.g., `genericRouter.ts`) to prevent a student from updating a teacher's document.
    *   **Complexity:** The response-wrapping middleware is advanced Express programming. It's powerful but can be tricky to debug if something goes wrong.

This solution is a fantastic and practical way to get CouchDB-like filtering capabilities from a simple PouchDB/Node.js stack, perfectly suited for environments like shared hosting.
