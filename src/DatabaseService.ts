import Dexie, { type Table } from 'dexie'; // Properly import Table as a type

export interface Class {
  id: string;
  name: string;
  subject: string;
  grade: string;
  teacherName?: string; // Optional, since teacher name is now global
  createdAt: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  classId: string; // Links to Class.id
  studentId?: string; // Optional unique student identifier
  createdAt: string;
}

export interface Evaluation {
  id: string;
  studentId: string; // Links to Student.id
  evaluationNumber: number; // Sequential number for this student's evaluations
  evaluator: string; // Teacher's name
  subject: string; // From student's class
  grade: string; // From student's class
  date: string; // YYYY-MM-DD format
  ratings: Record<string, 1 | 2 | 3 | 4>; // Updated to remove 'N/O'
  domainScores: Record<string, number | null>; // Updated to allow null values
  overallScore: number | null; // Overall calculated score
  strengths: string;
  developmentAreas: string;
  notes: string;
  createdAt: string;
}

export class EvalFlowDatabase extends Dexie {
  classes!: Table<Class>;
  students!: Table<Student>;
  evaluations!: Table<Evaluation>;

  constructor() {
    super('EvalFlowDatabase');
    this.version(4).stores({
      classes: 'id, name, subject, grade, createdAt',
      students: 'id, firstName, lastName, classId, studentId, createdAt',
      evaluations: 'id, studentId, evaluationNumber, date, overallScore, createdAt'
    });
  }
}

export const db = new EvalFlowDatabase();