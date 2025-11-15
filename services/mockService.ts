import { AppDatabase, User, Class, StudentUser, StudentData, TestAttempt, Prompts, AnsweredQuestion, Question } from '../types';
import { DEFAULT_LEVEL_PARAMS_INT, DEFAULT_LEVEL_PARAMS_FRAC, TOTAL_QUESTIONS } from '../constants';
import { generateTestQuestions } from './questionService';

// --- INITIAL PROMPTS ---
const INITIAL_PROMPTS: Prompts = {
    studentAnalysis: `
    You are an expert math tutor who is extremely good at identifying patterns quickly. You will be given the test history for a student. Your task is to provide a very concise, to-the-point summary for a teacher.

    Your entire output should be in markdown and follow this exact format:

    **Strengths:**
    - [Bullet point describing a clear strength, e.g., "Adding numbers without carrying."]
    - [Another bullet point...]

    **Difficulties:**
    - [Bullet point describing a clear difficulty, e.g., "Subtraction that requires borrowing."]
    - [Another bullet point, e.g., "Multiplication involving the number 7."]

    **Key Guidelines:**
    - Be extremely brief. Each bullet point should be a short phrase.
    - Focus only on the most significant and recurring patterns based on the provided data.
    - If there are no clear patterns of weakness or strength for a particular operation, state that explicitly. For example: "No discernible pattern in addition mistakes."
    - Analyze for common issues like:
        - Addition with/without carrying.
        - Subtraction with/without borrowing.
        - Specific multiplication facts (e.g., 7s, 8s, 12s).
        - Operations with negative numbers.
    - Do not provide any introductory text, tables, statistics, or concluding remarks. Only output the "Strengths" and "Difficulties" sections.
  `,
    classAnalysis: `
    You are an expert educational analyst. You are given data on students' recent incorrect answers. For each student, you see their **current level** and a list of their recent mistakes. Crucially, for each mistake, you are also told the **level of the test** on which it occurred.

    Your task is to identify common weaknesses and group students to help a teacher prioritize their time effectively.

    Your analysis MUST consider the context of the error:
    - A high-level student making a mistake on a difficult, high-level problem needs different attention than a student struggling with foundational concepts well below their current level.
    - **Prioritize groups of students who are making errors on material that is significantly below their current level.** For example, a Level 8 student making errors on a Level 3 test is a high-priority concern.

    Based on the provided data:
    1.  **Identify Common Weakness Themes:** Look for recurring error patterns. Examples could be: specific times tables, operations with negative numbers, subtraction that requires borrowing, etc.
    2.  **Group Students:** List the identified themes as clear, bolded markdown headers. Under each header, list the names of the students who exhibit that weakness. If the weakness is particularly concerning (i.e., on low-level material for that student), note it.
    3.  **Provide Actionable Advice:** For each group, give a brief, concrete suggestion. Tailor the advice based on the context. For a high-level student making an advanced error, suggest "reviewing complex strategies." For a student struggling with basics, suggest "reinforcing foundational skills with manipulatives."
    4.  **Acknowledge Strong Students:** If any students have no recent errors, list them under a "Confident Students" group.

    Your output should be well-formatted using markdown, logical, and help the teacher understand not just *what* the students' weaknesses are, but *how severe* and contextually important they are.
  `,
    schoolAnalysis: `
    You are an expert data analyst for a school administrator. You are given a list of all students in the school and their current math level in an adaptive arithmetic program. Your task is to provide a high-level executive summary of the school's overall performance.

    Based on the provided list of student levels:
    1.  **Overall Distribution:** Briefly describe the distribution of students across the levels. Are most students at the beginner (1-5), intermediate (6-12), or advanced (13+) levels?
    2.  **Identify At-Risk Cohorts:** Identify any significant groups of students who are clustered at lower levels. This could indicate a school-wide or grade-wide gap in foundational knowledge. Mention the level ranges where students seem to be "stuck".
    3.  **Identify High-Achievers:** Acknowledge the group of students who are progressing to the highest levels, as they may need further enrichment.
    4.  **Actionable Recommendations:** Suggest broad, school-level interventions. For example: "A significant number of students are struggling with levels 4-6, which focus on negative numbers. Consider organizing cross-class workshops on this topic." or "The students at the highest levels could be challenged with a math club or advanced projects."

    Be concise, use markdown for formatting, and focus on the big picture to help the administrator allocate resources effectively.
  `
};


// --- IN-MEMORY DATABASE ---
const db: AppDatabase = {
  users: [],
  classes: [],
  studentProfiles: {},
  levelParamsInt: DEFAULT_LEVEL_PARAMS_INT,
  levelParamsFrac: DEFAULT_LEVEL_PARAMS_FRAC,
  prompts: INITIAL_PROMPTS,
};

// --- DATA SEEDING ---
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

type Weakness = 'negatives' | 'multiplication' | 'subtraction_borrow' | 'addition_carry';
interface StudentCharacteristics {
    performance: 'high' | 'medium' | 'low';
    weaknesses: Weakness[];
}

// Helper to determine if a question matches a student's weakness profile.
const isWeaknessQuestion = (question: Question, weaknesses: Weakness[]): boolean => {
    const opType = question.operationType;
    const operands = question.operands;

    if (weaknesses.includes('multiplication') && opType === 'mul') return true;
    if (weaknesses.includes('negatives') && operands.some(op => typeof op === 'number' && op < 0)) return true;
    
    // Check for borrow/carry by looking at the units digits of integer operands.
    if (question.type === 'integer') {
        if (weaknesses.includes('subtraction_borrow') && opType === 'sub') {
            const n1 = operands[0] as number;
            const n2 = operands[1] as number;
            if (n1 > 0 && n2 > 0 && (n1 % 10) < (n2 % 10)) return true;
        }
        if (weaknesses.includes('addition_carry') && opType === 'add') {
            const n1 = operands[0] as number;
            const n2 = operands[1] as number;
            if (n1 > 0 && n2 > 0 && (n1 % 10) + (n2 % 10) >= 10) return true;
        }
    }

    return false;
}

// Simulates a single test attempt by generating a real test and then deciding which answers are incorrect based on the student's persona.
const simulateTestAttempt = (level: number, characteristics: StudentCharacteristics): TestAttempt => {
    // Generate a realistic, level-appropriate set of questions, just like a real student would see.
    const testQuestions = generateTestQuestions(level, db.levelParamsInt, db.levelParamsFrac);

    let incorrectCount = 0;
    switch (characteristics.performance) {
        case 'high': incorrectCount = getRandomInt(0, 2); break; // High performers make very few mistakes
        case 'medium': incorrectCount = getRandomInt(2, 6); break;
        case 'low': incorrectCount = getRandomInt(7, 15); break;
    }
    
    // Identify which of the generated questions align with the student's weaknesses.
    const allIndices = Array.from({ length: testQuestions.length }, (_, i) => i);
    const weaknessIndices = allIndices.filter(i => isWeaknessQuestion(testQuestions[i], characteristics.weaknesses));
    const nonWeaknessIndices = allIndices.filter(i => !weaknessIndices.includes(i));
    
    // Helper to shuffle an array
    const shuffle = (array: number[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    const incorrectIndices = new Set<number>();
    
    // 70% of errors should come from the student's specific weaknesses, if possible.
    const numWeaknessErrors = Math.ceil(incorrectCount * 0.7);

    const weaknessErrors = shuffle(weaknessIndices).slice(0, numWeaknessErrors);
    weaknessErrors.forEach(i => incorrectIndices.add(i));

    // Fill the remaining errors with random other questions.
    const remainingErrors = incorrectCount - incorrectIndices.size;
    const randomErrors = shuffle(nonWeaknessIndices).slice(0, remainingErrors);
    randomErrors.forEach(i => incorrectIndices.add(i));

    // Create the final list of answered questions for the test attempt.
    const answeredQuestions: AnsweredQuestion[] = testQuestions.map((q, i) => {
        const isCorrect = !incorrectIndices.has(i);
        return {
            questionText: q.text,
            operationType: q.operationType,
            operands: q.operands,
            submittedAnswer: isCorrect ? 'correct' : 'incorrect', // Simplified for simulation
            isCorrect: isCorrect,
            timeTakenSeconds: getRandomInt(5, 12) + (isCorrect ? 0 : getRandomInt(4, 10)), // Take longer on incorrect ones
        };
    });

    const correctCount = answeredQuestions.filter(q => q.isCorrect).length;

    return {
        date: new Date().toISOString(),
        level,
        correctCount,
        timeRemaining: getRandomInt(0, 180),
        totalScore: (level - 1) * TOTAL_QUESTIONS + correctCount,
        answeredQuestions
    };
};


const seedDatabase = () => {
    // Clear existing data
    db.users = [];
    db.classes = [];
    db.studentProfiles = {};
    db.prompts = INITIAL_PROMPTS;

    db.users.push({ id: 'admin-1', role: 'admin', firstName: 'Admin', surname: 'User', email: 'admin@sprint.com', password: 'admin' });

    const teacherChars = ['A', 'B'];
    const classChars = ['a', 'b'];
    const studentRegistry: string[] = [];

    teacherChars.forEach(teacherChar => {
        const teacherId = `teacher-${teacherChar}`;
        db.users.push({
            id: teacherId, role: 'teacher', firstName: `Teach${teacherChar}`, surname: 'User',
            email: `teach${teacherChar}@sprint.com`, password: 'password'
        });

        classChars.forEach(classChar => {
            const classId = `class-${teacherChar}${classChar}`;
            const newClass = { id: classId, name: `Class ${teacherChar}${classChar}`, teacherIds: [teacherId], studentIds: [] as string[] };

            for (let i = 1; i <= 10; i++) {
                const studentId = `student-${teacherChar}${classChar}${i}`;
                const student = {
                    id: studentId, role: 'student' as const, firstName: `Student`, surname: `${teacherChar}${classChar}${i}`,
                    password: 'password', locked: false
                };
                db.users.push(student);
                newClass.studentIds.push(studentId);
                studentRegistry.push(studentId);
            }
            db.classes.push(newClass);
        });
    });

    // --- Define Student Personas ---
    const studentPersonas: Record<string, StudentCharacteristics> = {};
    studentRegistry.forEach((studentId, i) => {
      const mod = i % 10;
      if (mod < 3) { // 30% are high performers. Give them a minor, high-level weakness.
        studentPersonas[studentId] = { performance: 'high', weaknesses: [Math.random() < 0.5 ? 'multiplication' : 'negatives'] };
      } else if (mod < 5) { // 20% are struggling students with foundational issues.
        studentPersonas[studentId] = { performance: 'low', weaknesses: ['addition_carry', 'subtraction_borrow'] };
      } else { // 50% are average students with a specific weakness.
         const weaknesses: Weakness[] = ['multiplication', 'negatives'];
         studentPersonas[studentId] = { performance: 'medium', weaknesses: [weaknesses[i % weaknesses.length]] };
      }
    });


    // --- Generate Realistic History for All Students ---
    studentRegistry.forEach(studentId => {
        const characteristics = studentPersonas[studentId];
        let currentLevel = 1;
        let consecutiveFastTrackCount = 0;
        const history: TestAttempt[] = [];
        const numTests = 12; // Give every student 12 tests for a consistent history length

        for (let i = 0; i < numTests; i++) {
            const attempt = simulateTestAttempt(currentLevel, characteristics);
            history.push(attempt);

            let newLevel = currentLevel;
            // Struggling students have a high chance of not leveling up
            if (characteristics.performance === 'low' && Math.random() < 0.6) {
                // No level change
            } else {
                 if (attempt.correctCount > 22) {
                    if (attempt.timeRemaining > 60) newLevel += 2;
                    else if (attempt.timeRemaining > 20) newLevel += 1;
                    consecutiveFastTrackCount = 0;
                } else if (attempt.correctCount >= 20 && attempt.timeRemaining < 20) {
                    consecutiveFastTrackCount += 1;
                    if (consecutiveFastTrackCount >= 3) {
                        newLevel += 1;
                        consecutiveFastTrackCount = 0;
                    }
                } else {
                    consecutiveFastTrackCount = 0;
                }
            }
            currentLevel = Math.min(Math.max(newLevel, 1), 12); // Cap max level at 12
        }

        // Final check to make sure some students are stuck low
        if(characteristics.performance === 'low') {
            currentLevel = Math.min(currentLevel, getRandomInt(1, 4));
        }

        db.studentProfiles[studentId] = {
            currentLevel,
            history,
            consecutiveFastTrackCount
        };
    });
};

seedDatabase();


const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- PROMPT MANAGEMENT API ---
export const getPrompts = async (): Promise<Prompts> => {
    await delay(50);
    return JSON.parse(JSON.stringify(db.prompts));
}

export const updatePrompts = async (newPrompts: Prompts): Promise<void> => {
    await delay(200);
    db.prompts = { ...newPrompts };
}


// --- AUTHENTICATION API ---
export const login = async (usernameOrEmail: string, password: string): Promise<{ user: User | null; error?: string }> => {
  await delay(300);
  const trimmedUsernameOrEmail = usernameOrEmail.trim().toLowerCase();
  
  const user = db.users.find(u => {
    if ((u.role === 'admin' || u.role === 'teacher') && 'email' in u) {
      return u.email.toLowerCase() === trimmedUsernameOrEmail;
    }
    if (u.role === 'student') {
      const studentUsername = `student.${u.surname.toLowerCase()}`;
      const normalizedInput = trimmedUsernameOrEmail.replace(/\s/g, '.');
      return studentUsername === normalizedInput;
    }
    return false;
  });

  if (user && user.password === password.trim()) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    return { user };
  }
  return { user: null, error: 'Invalid credentials. For students, username is student.<surname> (e.g., student.aa1)' };
};

export const logout = (): void => {
  sessionStorage.removeItem('currentUser');
};

export const getCurrentUser = (): User | null => {
  try {
    const userJson = sessionStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error("Failed to parse user from sessionStorage", error);
    sessionStorage.removeItem('currentUser');
    return null;
  }
};

// --- USER MANAGEMENT API ---
export const getUsers = async (): Promise<User[]> => {
  await delay(100);
  return [...db.users];
};

export const createUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  await delay(200);
  const rolePrefix = userData.role;
  const docId = `${rolePrefix}-${crypto.randomUUID().slice(0, 8)}`; 
  
  const newUser: User = { ...userData, id: docId } as User;
  db.users.push(newUser);

  if (newUser.role === 'student') {
    db.studentProfiles[newUser.id] = {
      currentLevel: 1,
      history: [],
      consecutiveFastTrackCount: 0,
    };
  }

  return newUser;
};

export const updateUser = async (userId: string, updates: Partial<StudentUser>): Promise<User> => {
  await delay(100);
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) throw new Error("User not found");
  
  const userToUpdate = db.users[userIndex];
  if (userToUpdate.role !== 'student') {
    throw new Error('This function can only be used to update student users.');
  }

  const updatedUser: StudentUser = { ...userToUpdate, ...updates };
  db.users[userIndex] = updatedUser;
  return db.users[userIndex];
};

export const createStudentAndAddToClass = async (
    studentData: Omit<StudentUser, 'id' | 'role' | 'locked'>,
    classId: string
): Promise<{ newUser: StudentUser, updatedClass: Class }> => {
  const studentPayload: Omit<StudentUser, 'id'> = {
      ...studentData,
      role: 'student',
      locked: false,
  };
  const newUser = await createUser(studentPayload) as StudentUser;
  const updatedClass = await addStudentToClass(classId, newUser.id);
  return { newUser, updatedClass };
};

// --- CLASS MANAGEMENT API ---
export const getAllClasses = async (): Promise<Class[]> => {
  await delay(100);
  return [...db.classes];
};

export const getClassesForTeacher = async (teacherId: string): Promise<Class[]> => {
  await delay(100);
  return db.classes.filter((c: Class) => Array.isArray(c.teacherIds) && c.teacherIds.includes(teacherId));
};

export const createClass = async (name: string, teacherId: string): Promise<Class> => {
  await delay(200);
  const id = `class-${crypto.randomUUID().slice(0, 8)}`;
  const newClass: Class = {
      id,
      name,
      teacherIds: [teacherId],
      studentIds: [],
  };
  db.classes.push(newClass);
  return newClass;
};

export const addStudentToClass = async (classId: string, studentId: string): Promise<Class> => {
  await delay(100);
  const classIndex = db.classes.findIndex(c => c.id === classId);
  if (classIndex === -1) throw new Error("Class not found");
  
  const studentIds = db.classes[classIndex].studentIds;
  if (!studentIds.includes(studentId)) {
      studentIds.push(studentId);
  }
  return db.classes[classIndex];
};

// --- STUDENT DATA API ---
export const getAllStudentProfiles = async (): Promise<Record<string, StudentData>> => {
    await delay(100);
    return {...db.studentProfiles};
}

export const getStudentProfile = async (studentId: string): Promise<StudentData> => {
  await delay(50);
  if (db.studentProfiles[studentId]) {
    return JSON.parse(JSON.stringify(db.studentProfiles[studentId]));
  }
  const defaultProfile: StudentData = {
    currentLevel: 1,
    history: [],
    consecutiveFastTrackCount: 0,
  };
  db.studentProfiles[studentId] = defaultProfile;
  return defaultProfile;
};

export const updateStudentProfileAfterTest = async (studentId: string, attempt: TestAttempt): Promise<StudentData> => {
  await delay(100);
  const studentData = await getStudentProfile(studentId);
  let newLevel = studentData.currentLevel;
  let newConsecutiveCount = studentData.consecutiveFastTrackCount;
  
  if (attempt.correctCount > 22) {
      if (attempt.timeRemaining > 60) newLevel += 2;
      else if (attempt.timeRemaining > 20) newLevel += 1;
      newConsecutiveCount = 0;
  } else if (attempt.correctCount >= 20 && attempt.timeRemaining < 20) {
      newConsecutiveCount += 1;
      if (newConsecutiveCount >= 3) {
          newLevel += 1;
          newConsecutiveCount = 0;
      }
  } else {
      newConsecutiveCount = 0;
  }
  
  newLevel = Math.min(newLevel, 20);
  newLevel = Math.max(newLevel, 1);

  const history = Array.isArray(studentData.history) ? studentData.history : [];

  const newStudentData: StudentData = {
    currentLevel: newLevel,
    history: [...history, attempt],
    consecutiveFastTrackCount: newConsecutiveCount,
  };

  db.studentProfiles[studentId] = newStudentData;
  return newStudentData;
};

// --- LEVEL PARAMS API ---
export const getLevelParams = async (): Promise<{ levelParamsInt: number[][], levelParamsFrac: number[][] }> => {
  await delay(50);
  return {
    levelParamsInt: db.levelParamsInt,
    levelParamsFrac: db.levelParamsFrac,
  }
};

export const updateLevelParams = async (params: { levelParamsInt?: number[][], levelParamsFrac?: number[][] }): Promise<void> => {
  await delay(100);
  if (params.levelParamsInt) {
    db.levelParamsInt = params.levelParamsInt;
  }
  if (params.levelParamsFrac) {
    db.levelParamsFrac = params.levelParamsFrac;
  }
};
