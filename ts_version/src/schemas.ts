// src/schemas.ts

// We add PouchDB's _id and _rev fields to our base document types
export interface PouchDBDocument {
    _id?: string;
    _rev?: string;
}

export interface ExistingPouchDBDocument {
    _id: string;
    _rev: string;
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
    role: 'student' | 'teacher' | 'admin';
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

// A utility type that converts a document type to its "existing" version,
// making the PouchDB fields non-optional.
export type Existing<T extends PouchDBDocument> = T & ExistingPouchDBDocument;

// A union type for any document that has been fetched from the database.
export type AnyExistingDocument = Existing<User> | Existing<Teacher> | Existing<Student> | Existing<Class>;
