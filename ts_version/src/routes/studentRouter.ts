import express, { Router, Request, Response } from 'express';
import PouchDB from 'pouchdb';
import { Class, Student, Existing } from '../schemas';

export const createStudentRouter = (db: PouchDB.Database): Router => {
    const router = Router();
    const type = 'student';

    // GET all students (with role-based filtering)
    router.get('/', async (req: Request, res: Response) => {
        try {
            const user = req.user!;
            
            // Step 1: Efficiently fetch ONLY student and class documents.
            const findResult = await db.find({
                selector: { type: { $in: ['student', 'class'] } }
            });
            const allRelevantDocs = findResult.docs as (Existing<Student> | Existing<Class>)[];

            const allStudents = allRelevantDocs.filter(d => d.type === 'student') as Existing<Student>[];
            let finalDocs: Existing<Student>[] = [];

            if (user.role === 'student') {
                finalDocs = allStudents.filter(doc => doc._id === user.userId);
            } else if (user.role === 'teacher') {
                const teacherClasses = allRelevantDocs.filter(d => d.type === 'class' && d.teacherId === user.userId) as Existing<Class>[];
                const studentIds = new Set<string>();
                teacherClasses.forEach(classDoc => classDoc.studentIds.forEach(id => studentIds.add(id)));
                finalDocs = allStudents.filter(doc => studentIds.has(doc._id));
            } else if (user.role === 'admin') {
                finalDocs = allStudents;
            }
            
            res.json(finalDocs);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST (Create) a new student
    router.post('/', async (req: Request, res: Response) => {
        try {
            const user = req.user!;
            // Authorization: Only admins or teachers can create students
            if (user.role !== 'admin' && user.role !== 'teacher') {
                return res.status(403).json({ error: 'Forbidden: You do not have permission to create students.' });
            }

            const newDoc: Student = {
                ...req.body,
                type: type,
                createdAt: new Date().toISOString(),
            };
            const result = await db.post(newDoc);
            res.status(201).json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });
    
    // PUT (Update) a student by ID
    router.put('/:id', async (req: Request, res: Response) => {
        try {
            const user = req.user!;
            const doc = await db.get<Existing<Student>>(req.params.id);

            // Authorization: Admins can update any student. Teachers can update their students.
            if (user.role !== 'admin') {
                 // Basic check: more complex logic needed to verify teacher's student
                return res.status(403).json({ error: 'Forbidden: You do not have permission to update this student.' });
            }

            const updatedDoc: Student = { ...doc, ...req.body, updatedAt: new Date().toISOString() };
            const result = await db.put(updatedDoc);
            res.json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE a student by ID
    router.delete('/:id', async (req: Request, res: Response) => {
        try {
            const user = req.user!;
             // Authorization: Only admins can delete students
            if (user.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden: You do not have permission to delete students.' });
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