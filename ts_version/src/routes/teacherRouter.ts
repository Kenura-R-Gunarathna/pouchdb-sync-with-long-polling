import express, { Router, Request, Response } from 'express';
import PouchDB from 'pouchdb';
import { Class, Teacher, Existing } from '../schemas';

export const createTeacherRouter = (db: PouchDB.Database): Router => {
    const router = Router();
    const type = 'teacher';

    router.get('/', async (req: Request, res: Response) => {
        try {
            const user = req.user!;

            // Efficiently fetch ONLY teacher and class documents
            const findResult = await db.find({
                selector: { type: { $in: ['teacher', 'class'] } }
            });
            const allRelevantDocs = findResult.docs as (Existing<Teacher> | Existing<Class>)[];

            const allTeachers = allRelevantDocs.filter(d => d.type === 'teacher') as Existing<Teacher>[];
            let finalDocs: Existing<Teacher>[] = [];

            if (user.role === 'teacher') {
                finalDocs = allTeachers.filter(doc => doc._id === user.userId);
            } else if (user.role === 'student') {
                const studentClasses = allRelevantDocs.filter(d => d.type === 'class' && d.studentIds.includes(user.userId)) as Existing<Class>[];
                const teacherIds = new Set<string>(studentClasses.map(c => c.teacherId));
                finalDocs = allTeachers.filter(doc => teacherIds.has(doc._id));
            } else if (user.role === 'admin') {
                finalDocs = allTeachers;
            }
            
            res.json(finalDocs);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST (Create) a new teacher
    router.post('/', async (req: Request, res: Response) => {
        try {
            const user = req.user!;
            // Authorization: Only admins can create teachers
            if (user.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden: You do not have permission to create teachers.' });
            }

            const newDoc: Teacher = { ...req.body, type: type, createdAt: new Date().toISOString() };
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
            const doc = await db.get<Existing<Teacher>>(docId);

            // Authorization: Admin can update anyone, teachers can only update themselves
            if (user.role !== 'admin' && doc._id !== user.userId) {
                return res.status(403).json({ error: 'Forbidden: You can only update your own profile.' });
            }

            const updatedDoc: Teacher = { ...doc, ...req.body, updatedAt: new Date().toISOString() };
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
                return res.status(403).json({ error: 'Forbidden: You do not have permission to delete teachers.' });
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