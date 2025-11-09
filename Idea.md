# PouchDB Sync Demo - Client & Server

Simple demonstration of PouchDB syncing between client and server using LevelDB (no CouchDB process needed!)

## What This Does

✅ **Server**: Stores data in `./server-data` using LevelDB  
✅ **Client**: Stores data locally in `./client-data` using LevelDB  
✅ **Auto-sync**: Changes sync bidirectionally in real-time  
✅ **File support**: Store images and small files as attachments  
✅ **Offline-first**: Works offline, syncs when connection restored

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Server (Terminal 1)
```bash
npm run server
```

You should see:
```
🚀 PouchDB Server running on http://localhost:3000
📊 Database location: ./server-data
🔄 Sync endpoint: http://localhost:3000/mydb
```

### 3. Start Client (Terminal 2)
```bash
npm run client
```

### 4. Test Sync with Multiple Clients (Terminal 3)
```bash
npm run client2
```

## Try It Out

1. **Add a document** in Client 1
2. **List documents** in Client 2 - you'll see it synced!
3. **Add an image** - place a `.jpg` file in the folder and add it
4. **Stop the server** - clients still work offline
5. **Restart server** - everything syncs back up

## How It Works

### LevelDB Storage
- **No separate database process** - LevelDB is embedded
- **Just files on disk** - check `./client-data` and `./server-data` folders
- **Fast and lightweight** - perfect for Electron apps
- **Easy to bundle** - npm installs everything needed

### Sync Protocol
```
Client (LevelDB) ←→ HTTP ←→ Server (LevelDB)
```

Both client and server use PouchDB which:
- Automatically uses LevelDB in Node.js
- Handles conflict resolution
- Tracks changes for sync
- Stores files as attachments

## File Attachments

Images and files are stored as **base64** inside documents:
- ✅ **Good for**: Images, PDFs, small files (<5MB)
- ⚠️ **Not ideal for**: Large videos, bulk files

### Size Limits
- **Practical limit**: ~5-10MB per file
- **Storage**: Limited by disk space (not RAM)

## For Electron

This same code works in Electron! Just:
1. Bundle these dependencies
2. Run server.js in main process (optional)
3. Use client code in renderer
4. LevelDB data goes to `app.getPath('userData')`

## Project Structure

```
├── server.js          # PouchDB server
├── client.js          # PouchDB client with sync
├── package.json       # Dependencies
├── server-data/       # Server database (created automatically)
└── client-data/       # Client database (created automatically)
```

## Key Benefits vs CouchDB Child Process

| Feature | LevelDB (This) | CouchDB Process |
|---------|---------------|-----------------|
| Bundling | ✅ Easy (npm only) | ⚠️ Bundle binaries |
| App size | ✅ Small | ❌ +50-100MB |
| Startup | ✅ Instant | ⚠️ 1-2 seconds |
| Resources | ✅ Minimal | ⚠️ Separate process |
| Sync | ✅ Same protocol | ✅ Same protocol |

## Next Steps

- Add authentication
- Implement conflict resolution UI
- Add query indexes for faster searches
- Deploy server to Railway/Fly.io
- Build Electron wrapper

---

Perfect! Let's start simple and yes, **LevelDB is exactly what you want** for easy bundling!

## What is LevelDB?

**LevelDB = Local key-value store (like SQLite but simpler)**

- Created by Google
- Fast, embedded database
- No separate process needed (unlike CouchDB)
- PouchDB uses it automatically in Node.js
- **Perfect for Electron** - just bundle with your app

**Key difference:**
- **SQLite**: SQL database, requires queries
- **LevelDB**: Key-value store, used by PouchDB internally
- **CouchDB**: Full server process

**So yes! PouchDB + LevelDB = Easy bundling, no child process, still syncs!**

## Simple Demo: Client + Server

Let me create a basic setup:Perfect! Now let me create a quick setup guide:## Summary: Why LevelDB is Perfect for You

**LevelDB = Embedded database (like SQLite) used by PouchDB automatically**

### Comparison:

```
┌─────────────────────────────────────────────┐
│ Your App (Node.js/Electron)                 │
│ └─ PouchDB ──→ Uses LevelDB automatically   │
│               (no configuration needed!)    │
└─────────────────────────────────────────────┘
```

**vs CouchDB child process:**

```
┌─────────────────────────────────────────────┐
│ Your App (Electron)                         │
│ ├─ PouchDB ──→ HTTP ──→ localhost:5984    │
│ └─ CouchDB Process (separate binary)       │
└─────────────────────────────────────────────┘
```

### Why LevelDB Wins for Electron:

1. **No bundling complexity** - Just `npm install pouchdb`
2. **Smaller app size** - ~5MB vs ~100MB with CouchDB
3. **Instant startup** - No waiting for process to start
4. **Same sync capability** - Still syncs to remote server
5. **Files work perfectly** - Attachments stored in LevelDB

### What You Get:

✅ Store documents locally  
✅ Store images/files as attachments  
✅ Sync to server automatically  
✅ Works offline  
✅ No configuration needed  
✅ Cross-platform (Windows, Mac, Linux)

**Try the demo and you'll see how simple it is!** The server and client are complete working examples. Just run them in two terminals and watch the magic happen.

Want me to add anything specific to the demo (like authentication, or showing how to integrate with Electron)?
