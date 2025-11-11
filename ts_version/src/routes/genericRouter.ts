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