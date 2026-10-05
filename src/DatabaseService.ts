import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  subject: string;
  grade: string;
  employeeId?: string;
  createdAt: string;
}

export interface Evaluation {
  id: string;
  teacherId: string;
  evaluationNumber: number;
  evaluator: string;
  subject: string;
  grade: string;
  date: string;
  ratings: Record<string, 1 | 2 | 3 | 4 | "N/O">;
  domainScores: Record<string, number | null>;
  overallScore: number | null;
  strengths: string;
  developmentAreas: string;
  notes: string;
  createdAt: string;
}

export class EvalFlowDatabase extends Dexie {
  teachers!: Table<Teacher>;
  evaluations!: Table<Evaluation>;

  constructor() {
    super('EvalFlowDatabase');
    this.version(2).stores({
      teachers: 'id, firstName, lastName, subject, grade, employeeId, createdAt',
      evaluations: 'id, teacherId, evaluationNumber, date, createdAt'
    });
  }
}

export const db = new EvalFlowDatabase();