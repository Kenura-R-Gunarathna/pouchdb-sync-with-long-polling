# PouchDB Sync Demo - Client & Server with Hono

Simple demonstration of PouchDB syncing between client and server using **Hono** framework and LevelDB (no CouchDB process needed!)

## What This Does

✅ **Server**: Hono REST API + PouchDB sync endpoint  
✅ **Client**: Hono REST API with local LevelDB storage  
✅ **Auto-sync**: Changes sync bidirectionally in real-time  
✅ **File support**: Store images and small files as attachments  
✅ **Offline-first**: Works offline, syncs when connection restored  
✅ **Fast**: Hono is one of the fastest Node.js frameworks

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Server (Terminal 1)
```bash
pnpm start:server
```

### 3. Start clients

```bash
cd html-front-client-1
pnpx serve --listen 2001 --cors

cd html-front-client-2
pnpx serve --listen 2002 --cors

html-front-client-3
pnpx serve --listen 2003 --cors
```

You should see:
```
🚀 Hono Server running on http://localhost:3000
🔄 PouchDB Sync endpoint: http://localhost:3001/db/mydb
📊 Database location: ./server-data
```

Note: Server runs on TWO ports:
- **3000**: Hono REST API
- **3001**: PouchDB sync endpoint

### 3. Start Client (Terminal 2)
```bash
npm run client
```

You should see:
```
🚀 Client running on http://localhost:4000
📁 Local database: ./client-data-4000
🔗 Syncing with: http://localhost:3001/db/mydb
```

### 4. Test with API calls (Terminal 3)
```bash
# Create a document
curl -X POST http://localhost:4000/docs \
  -H "Content-Type: application/json" \
  -d '{"title": "Hello", "content": "World"}'

# List all documents
curl http://localhost:4000/docs

# Run full test suite
chmod +x test-client.sh
./test-client.sh
```

### 5. Test Sync with Multiple Clients (Terminal 4)
```bash
npm run client2
# Runs on port 4001, syncs with same server
```

## Try It Out

1. **Add a document** in Client 1
2. **List documents** in Client 2 - you'll see it synced!
3. **Add an image** - place a `.jpg` file in the folder and add it
4. **Stop the server** - clients still work offline
5. **Restart server** - everything syncs back up

## How It Works

### Hono Framework
- **Ultra-fast**: One of the fastest Node.js frameworks
- **Lightweight**: Small bundle size, perfect for Electron
- **Modern**: Built-in TypeScript support, clean API
- **Cross-platform**: Works on Node.js, Bun, Deno, Cloudflare Workers

### Architecture
```
Client (Hono + LevelDB) ←→ HTTP ←→ Server (Hono + LevelDB + PouchDB Sync)
     Port 4000                           Port 3000 (API)
                                         Port 3001 (Sync)
```

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