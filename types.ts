export type QuestionType = 'integer' | 'rational';

export interface RationalNumber {
  num: number;
  den: number;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  answer: number | RationalNumber;
  operationType: 'add' | 'sub' | 'mul' | 'div';
  operands: (number | RationalNumber)[];
}

export interface AnsweredQuestion {
  questionText: string;
  submittedAnswer: string;
  isCorrect: boolean;
  timeTakenSeconds: number;
  operationType: 'add' | 'sub' | 'mul' | 'div';
  operands: (number | RationalNumber)[];
}

export interface TestAttempt {
  date: string;
  level: number;
  correctCount: number;
  timeRemaining: number;
  totalScore: number;
  answeredQuestions: AnsweredQuestion[];
}

export interface StudentData {
  currentLevel: number;
  history: TestAttempt[];
  consecutiveFastTrackCount: number;
}

// --- NEW TYPES for Multi-User System ---

export type Role = 'admin' | 'teacher' | 'student';

export interface BaseUser {
  id: string;
  firstName: string;
  surname: string;
  password: string; // Plaintext for this simulation
  role: Role;
}

export interface AdminUser extends BaseUser {
  role: 'admin';
  email: string;
}

export interface TeacherUser extends BaseUser {
  role: 'teacher';
  email: string;
}

export interface StudentUser extends BaseUser {
  role: 'student';
  locked: boolean;
}

export type User = AdminUser | TeacherUser | StudentUser;

export interface Class {
  id: string;
  name: string;
  teacherIds: string[];
  studentIds: string[];
}

export interface AppDatabase {
  users: User[];
  classes: Class[];
  studentProfiles: Record<string, StudentData>; // Keyed by studentId
  levelParamsInt: number[][];
  levelParamsFrac: number[][];
}
