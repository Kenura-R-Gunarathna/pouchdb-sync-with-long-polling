import express, { Router, Request, Response } from 'express';
import PouchDB from 'pouchdb';
import { Class, Existing } from '../schemas';

export const createClassRouter = (db: PouchDB.Database): Router => {
    const router = Router();
    const type = 'class';

    router.get('/', async (req: Request, res: Response) => {
        try {
            const user = req.user!;

            // Efficiently fetch ONLY class documents
            const findResult = await db.find({
                selector: { type: 'class' }
            });
            const allClasses = findResult.docs as Existing<Class>[];
            
            let finalDocs: Existing<Class>[] = [];
            
            if (user.role === 'teacher') {
                finalDocs = allClasses.filter(doc => doc.teacherId === user.userId);
            } else if (user.role === 'student') {
                finalDocs = allClasses.filter(doc => doc.studentIds.includes(user.userId));
            } else if (user.role === 'admin') {
                finalDocs = allClasses;
            }
            
            res.json(finalDocs);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });
    
    // POST (Create) a new class
    router.post('/', async (req: Request, res: Response) => {
        try {
            const user = req.user!;
            // Authorization: Only admins can create classes
            if (user.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden: You do not have permission to create classes.' });
            }

            const newDoc: Class = { ...req.body, type: type, createdAt: new Date().toISOString() };
            const result = await db.post(newDoc);
            res.status(201).json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT (Update) a class by ID
    router.put('/:id', async (req: Request, res: Response) => {
        try {
            const user = req.user!;
            const doc = await db.get<Existing<Class>>(req.params.id);

            // Authorization: Admin can update any class, teachers can only update their own
            if (user.role !== 'admin' && doc.teacherId !== user.userId) {
                return res.status(403).json({ error: 'Forbidden: You do not have permission to update this class.' });
            }

            const updatedDoc: Class = { ...doc, ...req.body, updatedAt: new Date().toISOString() };
            const result = await db.put(updatedDoc);
            res.json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE a class by ID
    router.delete('/:id', async (req: Request, res: Response) => {
        try {
            const user = req.user!;
             // Authorization: Only admins can delete classes
            if (user.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden: You do not have permission to delete classes.' });
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