import { AppDatabase, User, Class, StudentUser, StudentData, TestAttempt, Prompts, AnsweredQuestion } from '../types';
import { DEFAULT_LEVEL_PARAMS_INT, DEFAULT_LEVEL_PARAMS_FRAC, TOTAL_QUESTIONS } from '../constants';

// --- INITIAL PROMPTS ---
const INITIAL_PROMPTS: Prompts = {
    studentAnalysis: `
    You are an expert data analyst and math tutor. You will be given the complete test history for a student. Your task is to provide a detailed, insightful, and actionable summary for a teacher.

    The data for each question is now highly structured. Instead of just the question text, you get a 'features' object with key analytical dimensions.

    - \`isCorrect\`: boolean
    - \`timeTakenSeconds\`: number
    - \`features\`:
        - \`operation\`: 'add', 'sub', 'mul', 'div'
        - \`operandSizeCategory\`: 'single-digit', 'double-digit', 'mixed-digits', or 'fractions'
        - \`requiresCarryOrBorrow\`: boolean (CRITICALLY IMPORTANT - this is true for additions that need to carry over, or subtractions that need to borrow)
        - \`questionIndex\`: The question number in the test (0-24)
        - \`timeIntoTestSeconds\`: How many seconds into the test this question was answered.

    Based on the ENTIRE history, provide a deep analysis. Use markdown for clear formatting.

    1.  **Overall Summary:** A brief, high-level overview of the student's progress, strengths, and primary areas for improvement.

    2.  **Conceptual Gaps Analysis:**
        *   **CRITICAL:** Analyze their performance on questions where \`requiresCarryOrBorrow\` is \`true\`. This is a major indicator of foundational understanding. Do they consistently get these wrong or take much longer? Highlight this as a key area for intervention.
        *   **Operations:** Which operations are weakest? Correlate this with other features. Do they struggle with subtraction specifically when it requires borrowing?
        *   **Number Size:** Does accuracy decrease when \`operandSizeCategory\` is 'double-digit' or 'mixed-digits'?

    3.  **Performance & Focus Analysis:**
        *   **Speed vs. Accuracy:** Is there a pattern? Are they rushing and making mistakes on easy questions? Are they slow but accurate?
        *   **Fatigue/Focus:** Analyze their performance based on \`questionIndex\` or \`timeIntoTestSeconds\`. Does their accuracy drop significantly towards the end of a test? This could indicate a focus or stamina issue.

    Synthesize these points into a comprehensive report. Be specific, use the feature data to back up your claims, and provide concrete, actionable recommendations. For example: "The student's accuracy drops from 90% to 40% on subtraction questions that require borrowing. This suggests a need for targeted practice with regrouping."
  `,
    classAnalysis: `
    You are an expert educational analyst. You are given data on students' recent incorrect answers in an arithmetic test. Your task is to identify common weaknesses and group students to help a teacher form small support groups.

    Based on the provided data:
    1.  **Identify Common Weakness Themes:** Look for recurring error patterns across multiple students. Examples could be: specific times tables (e.g., errors in questions involving 7s, 8s), operations with negative numbers, subtraction that requires borrowing, or specific fraction operations.
    2.  **Group Students:** List the identified themes as clear, bolded markdown headers (e.g., **Difficulty with Negative Numbers**). Under each header, list the names of the students who exhibit that weakness. A student can appear in multiple groups.
    3.  **Provide Actionable Advice:** For each group, give a brief, concrete suggestion for a small group activity or focus area.
    4.  **Acknowledge Strong Students:** If any students have no recent errors, list them under a "Confident Students" group who may not need immediate intervention.

    Your output should be well-formatted using markdown.
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

// Simulates a single test attempt for a student to generate history
const simulateTestAttempt = (level: number, performance: 'high' | 'medium' | 'low', testIndex: number): TestAttempt => {
    let correctCount = 0;
    switch (performance) {
        case 'high':
            correctCount = getRandomInt(23, 25); // Excellent performance
            break;
        case 'medium':
            correctCount = getRandomInt(19, 23); // Good enough to progress
            break;
        case 'low':
            correctCount = getRandomInt(10, 18); // Will not progress
            break;
    }
    
    const answeredQuestions: AnsweredQuestion[] = [];
    let timeIntoTestSeconds = 0;
    for(let i = 0; i < TOTAL_QUESTIONS; i++) {
        const isCorrect = i < correctCount;
        const timeTakenSeconds = getRandomInt(5, 15);
        timeIntoTestSeconds += timeTakenSeconds;

        const operation = ['add', 'sub', 'mul', 'div'][getRandomInt(0,3)] as 'add' | 'sub' | 'mul' | 'div';
        const requiresCarryOrBorrow = (operation === 'add' || operation === 'sub') && Math.random() < 0.4;

        answeredQuestions.push({
            questionText: `Q${i+1} (Simulated)`,
            submittedAnswer: isCorrect ? 'correct' : 'incorrect',
            isCorrect: isCorrect,
            timeTakenSeconds: timeTakenSeconds,
            operands: [getRandomInt(1, 20), getRandomInt(1,20)],
            features: {
                operation: operation,
                operandSizeCategory: Math.random() < 0.5 ? 'single-digit' : 'mixed-digits',
                requiresCarryOrBorrow,
                questionIndex: i,
                timeIntoTestSeconds,
                testIndex,
            }
        })
    }

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

    const teacherChars = ['A', 'B', 'C'];
    const classChars = ['a', 'b', 'c'];

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

            for (let i = 1; i <= 15; i++) {
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

    // Generate history for all students
    const highPerformers = [studentRegistry[0], studentRegistry[1]]; // First two students
    const lowPerformers = studentRegistry.slice(-3); // Last three students

    studentRegistry.forEach(studentId => {
        let performance: 'high' | 'medium' | 'low' = 'medium';
        if (highPerformers.includes(studentId)) performance = 'high';
        if (lowPerformers.includes(studentId)) performance = 'low';

        let currentLevel = 1;
        let consecutiveFastTrackCount = 0;
        const history: TestAttempt[] = [];
        const numTests = getRandomInt(10, 20);

        for (let i = 0; i < numTests; i++) {
            const attempt = simulateTestAttempt(currentLevel, performance, i);
            history.push(attempt);

            // Calculate next level based on performance
            let newLevel = currentLevel;
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
            currentLevel = Math.min(Math.max(newLevel, 1), 20);
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