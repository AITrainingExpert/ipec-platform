import { User } from '../types';

// Only the admin may download / export / print any report or data.
// Trainers can VIEW everything for their batch but can't take it out of the app.
export const canExport = (u?: User | null) => u?.role === 'admin';
