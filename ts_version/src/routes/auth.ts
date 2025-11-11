// src/routes/auth.ts

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import PouchDB from 'pouchdb';
import { User } from '../schemas';

// A simple secret for signing the token. In production, use an environment variable!
const JWT_SECRET = 'your-super-secret-key-that-is-long-and-random';

export const createAuthRouter = (db: PouchDB.Database): Router => {
    const router = Router();

    router.post('/login', async (req: Request, res: Response) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        try {
            // In a real app, you would query for the user and check a hashed password.
            // For this example, we'll assume a simple lookup.
            // Let's create a dummy user if they don't exist for demonstration.
            let userDoc: User;
            try {
                userDoc = await db.get<User>(`user_${username}`);
                // Here you would compare `password` with `userDoc.password` (hashed)
            } catch (e) {
                // For demo purposes, let's create the user with a role
                const role = username.startsWith('teacher') ? 'teacher' : 'student';
                const newUser: User = {
                    _id: `user_${username}`, // later we can use UUIDs
                    type: 'user',
                    username: username,
                    // In a real app, NEVER store plain text passwords. Use bcrypt.
                    password: password, 
                    // Assign a role. This is crucial for authorization.
                    role: role 
                };
                await db.put(newUser);
                userDoc = newUser;
            }

            // Create the JWT payload
            const payload = {
                userId: userDoc._id,
                username: userDoc.username,
                role: userDoc.role || 'student' // Default role
            };

            // Sign the token
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

            res.json({ message: 'Login successful', token });

        } catch (err: any) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
};