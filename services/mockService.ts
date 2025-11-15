import { AppDatabase, User, Class, StudentUser, StudentData, TestAttempt } from '../types';
import { DEFAULT_LEVEL_PARAMS_INT, DEFAULT_LEVEL_PARAMS_FRAC } from '../constants';

// --- IN-MEMORY DATABASE ---
const db: AppDatabase = {
  users: [],
  classes: [],
  studentProfiles: {},
  levelParamsInt: DEFAULT_LEVEL_PARAMS_INT,
  levelParamsFrac: DEFAULT_LEVEL_PARAMS_FRAC,
};

// --- DATA SEEDING ---
const seedDatabase = () => {
    // Clear existing data
    db.users = [];
    db.classes = [];
    db.studentProfiles = {};

    // Add the admin back
    db.users.push({ id: 'admin-1', role: 'admin', firstName: 'Admin', surname: 'User', email: 'admin@sprint.com', password: 'admin' });

    const teacherChars = ['A', 'B', 'C'];
    const classChars = ['a', 'b', 'c'];

    teacherChars.forEach(teacherChar => {
        // Create Teacher
        const teacherId = `teacher-${teacherChar}`;
        const teacher = {
            id: teacherId,
            role: 'teacher' as const,
            firstName: `Teach${teacherChar}`,
            surname: 'User',
            email: `teach${teacherChar}@sprint.com`,
            password: 'password'
        };
        db.users.push(teacher);

        classChars.forEach(classChar => {
            // Create Class
            const classId = `class-${teacherChar}${classChar}`;
            const newClass = {
                id: classId,
                name: `Class ${teacherChar}${classChar}`,
                teacherIds: [teacherId],
                studentIds: [] as string[]
            };

            // Create 15 Students for this class
            for (let i = 1; i <= 15; i++) {
                const studentId = `student-${teacherChar}${classChar}${i}`;
                const student = {
                    id: studentId,
                    role: 'student' as const,
                    firstName: `Student`,
                    surname: `${teacherChar}${classChar}${i}`,
                    password: 'password',
                    locked: false
                };
                db.users.push(student);
                newClass.studentIds.push(studentId);

                // Create a student profile with some varied data
                db.studentProfiles[studentId] = {
                    currentLevel: Math.floor(Math.random() * 5) + 1, // Level 1 to 5
                    history: [], // Keep history empty to avoid excessive memory use
                    consecutiveFastTrackCount: 0
                };
            }
            db.classes.push(newClass);
        });
    });
};

// Initialize DB with seeded data
seedDatabase();


// --- Helper to simulate API call latency ---
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));


// --- AUTHENTICATION API ---
export const login = async (usernameOrEmail: string, password: string): Promise<{ user: User | null; error?: string }> => {
  await delay(300);
  const trimmedUsernameOrEmail = usernameOrEmail.trim().toLowerCase();
  
  const user = db.users.find(u => {
    if ((u.role === 'admin' || u.role === 'teacher') && 'email' in u) {
      return u.email.toLowerCase() === trimmedUsernameOrEmail;
    }
    if (u.role === 'student') {
      const studentUsername = `${u.firstName.toLowerCase()}.${u.surname.toLowerCase()}`;
      const normalizedInput = trimmedUsernameOrEmail.replace(/\s/g, '.');
      return studentUsername === normalizedInput;
    }
    return false;
  });

  if (user && user.password === password.trim()) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    return { user };
  }
  return { user: null, error: 'Invalid credentials. For students, username is firstname.lastname (e.g., student.aa1)' };
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
  
  // Fix: Ensure we only update student users and help TypeScript infer the correct type.
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
  // If profile doesn't exist for some reason, create a default one
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
