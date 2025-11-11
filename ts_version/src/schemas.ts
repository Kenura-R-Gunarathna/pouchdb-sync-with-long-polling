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