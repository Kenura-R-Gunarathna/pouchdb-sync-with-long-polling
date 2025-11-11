import express, { Router, Request, Response } from 'express';
import PouchDB from 'pouchdb';
import { User, Existing } from '../schemas';

export const createUserRouter = (db: PouchDB.Database): Router => {
    const router = Router();
    const type = 'user';

    router.get('/', async (req: Request, res: Response) => {
        try {
            const user = req.user!;
            if (user.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden' });
            }

            // Efficiently fetch ONLY user documents
            const findResult = await db.find({
                selector: { type: 'user' }
            });
            const finalDocs = findResult.docs as Existing<User>[];
            
            res.json(finalDocs);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST (Create) a new user (Admins only)
    router.post('/', async (req: Request, res: Response) => {
        try {
            const user = req.user!;
            if (user.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden' });
            }
            // Add hashing logic for password here!
            const newDoc: User = { ...req.body, type: type, createdAt: new Date().toISOString() };
            const result = await db.post(newDoc);
            res.status(201).json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT (Update) a teacher by ID
    router.put('/:id', async (req: Request, res: Response) => {
        try {
            const user = req.user!;
            const docId = req.params.id;
            const doc = await db.get<Existing<User>>(docId);

            // Authorization: Admin can update anyone, users can only update themselves
            if (user.role !== 'admin' && doc._id !== user.userId) {
                return res.status(403).json({ error: 'Forbidden: You can only update your own profile.' });
            }

            const updatedDoc: Existing<User> = { ...doc, ...req.body, updatedAt: new Date().toISOString() };
            const result = await db.put(updatedDoc);
            res.json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE a teacher by ID
     router.delete('/:id', async (req: Request, res: Response) => {
        try {
            const user = req.user!;
             // Authorization: Only admins can delete teachers
            if (user.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden: You do not have permission to delete users.' });
            }
            const doc = await db.get(req.params.id);
            const result = await db.remove(doc);
            res.json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};