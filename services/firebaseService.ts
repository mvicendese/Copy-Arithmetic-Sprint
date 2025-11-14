// Fix: Augment the global ImportMeta interface to include Vite's `env` property,
// satisfying TypeScript when Vite's client types are not automatically available.
declare global {
    interface ImportMeta {
        readonly env: {
            readonly VITE_FIREBASE_API_KEY?: string;
        };
    }
}

import { AppDatabase, User, Class, Role, StudentUser, StudentData, TestAttempt } from '../types';
import { DEFAULT_LEVEL_PARAMS_INT, DEFAULT_LEVEL_PARAMS_FRAC } from '../constants';

// --- FIREBASE CONFIGURATION ---
const FIREBASE_PROJECT_ID = 'arithmetic-sprint'; 
// The API Key is now read securely from an environment variable
const FIREBASE_API_KEY = import.meta.env?.VITE_FIREBASE_API_KEY;

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// --- Firestore Data Conversion Helpers ---

// Converts a Firestore document's `fields` object into a regular JavaScript object.
const fromFirestore = (fields: any): any => {
  if (!fields) return {};
  const result: any = {};
  for (const key in fields) {
    const valueType = Object.keys(fields[key])[0];
    // Handle nested maps (objects) recursively
    if (valueType === 'mapValue') {
      result[key] = fromFirestore(fields[key][valueType].fields);
    } 
    // Handle arrays
    else if (valueType === 'arrayValue') {
       result[key] = (fields[key][valueType].values || []).map((v: any) => fromFirestore({ temp: v }).temp);
    }
    // Handle all other primitive types
    else {
      result[key] = fields[key][valueType];
    }
  }
  return result;
};


// Converts a regular JavaScript object into a Firestore document's `fields` object.
const toFirestore = (data: any): any => {
  const fields: any = {};
  for (const key in data) {
    if (data[key] === undefined) continue; // Don't serialize undefined values
    const value = data[key];
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      // Firestore REST API distinguishes between integer and double
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: value };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      // Ensure we handle empty arrays correctly
      fields[key] = { arrayValue: { values: value.map(v => toFirestore({v}).v) } };
    } else if (typeof value === 'object' && value !== null) {
      fields[key] = { mapValue: { fields: toFirestore(value) } };
    } else if (value === null) {
      fields[key] = { nullValue: null };
    }
  }
  return fields;
};


// --- AUTHENTICATION API ---

export const login = async (usernameOrEmail: string, password: string): Promise<{ user: User | null; error?: string }> => {
  if (!FIREBASE_API_KEY) {
    return { user: null, error: "Firebase API Key is not configured. Please follow the deployment instructions in README.md." };
  }
  
  const trimmedUsernameOrEmail = usernameOrEmail.trim().toLowerCase();
  
  // This simulates login by querying the user collection.
  // For a real production app, use Firebase Authentication.
  try {
    const users = await getUsers();
    const user = users.find(u => {
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
    return { user: null, error: 'Invalid credentials. For students, username is firstname.lastname (e.g., john.doe)' };
  } catch(error) {
    console.error("Login failed:", error);
    const err = error as Error;
    if (err.message.includes('API key not valid')) {
       return { user: null, error: 'The provided Firebase API Key is invalid. Please check your Firebase Hosting environment variables.' };
    }
    return { user: null, error: 'Could not connect to the server. Please try again later.' };
  }
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
    const res = await fetch(`${BASE_URL}/users?key=${FIREBASE_API_KEY}`);
    if (!res.ok) {
      const errorData = await res.json();
      console.error('Firebase Error:', errorData);
      throw new Error(`Failed to fetch users: ${errorData.error.message}`);
    }
    const data = await res.json();
    return data.documents?.map((doc: any) => ({ id: doc.name.split('/').pop(), ...fromFirestore(doc.fields) })) || [];
};

export const createUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    // Firestore can auto-generate IDs, but for this structure we'll create them client-side
    const docId = `user-${crypto.randomUUID().slice(0, 8)}`; 
    
    // Create the full user object including the ID we'll use in the path
    const newUser: User = { ...userData, id: docId } as User;

    const res = await fetch(`${BASE_URL}/users/${docId}?key=${FIREBASE_API_KEY}`, {
        method: 'PATCH', // Using PATCH on a non-existent doc creates it.
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestore(newUser) }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        console.error('Firebase Error:', errorData);
        throw new Error(`Failed to create user: ${errorData.error.message}`);
    }
    
    if (newUser.role === 'student') {
        // Create initial student profile
        await updateStudentProfile(newUser.id, {
          currentLevel: 1,
          history: [],
          consecutiveFastTrackCount: 0,
        });
    }

    return newUser;
};


export const updateUser = async (userId: string, updates: Partial<StudentUser>): Promise<User> => {
    // Build the `updateMask` query parameter to tell Firestore which fields to update.
    const updateMask = Object.keys(updates).map(key => `updateMask.fieldPaths=${key}`).join('&');

    const res = await fetch(`${BASE_URL}/users/${userId}?${updateMask}&key=${FIREBASE_API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestore(updates) }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        console.error('Firebase Error:', errorData);
        throw new Error(`Failed to update user: ${errorData.error.message}`);
    }
    const updatedDoc = await res.json();
    return { id: updatedDoc.name.split('/').pop(), ...fromFirestore(updatedDoc.fields) };
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
export const getClassesForTeacher = async (teacherId: string): Promise<Class[]> => {
    // Firestore REST API for queries is complex. A simple fetch and client-side filter is easier here.
    // For production apps, consider more advanced querying or Firebase SDKs.
    const res = await fetch(`${BASE_URL}/classes?key=${FIREBASE_API_KEY}`);
    if (!res.ok) throw new Error('Failed to fetch classes');
    const data = await res.json();
    const allClasses: Class[] = data.documents?.map((doc: any) => ({ id: doc.name.split('/').pop(), ...fromFirestore(doc.fields) })) || [];
    return allClasses.filter((c: Class) => Array.isArray(c.teacherIds) && c.teacherIds.includes(teacherId));
};

export const createClass = async (name: string, teacherId: string): Promise<Class> => {
    const id = `class-${crypto.randomUUID().slice(0, 8)}`;
    const newClass: Class = {
        id,
        name,
        teacherIds: [teacherId],
        studentIds: [],
    };

    await fetch(`${BASE_URL}/classes/${id}?key=${FIREBASE_API_KEY}`, {
        method: 'PATCH', // Using PATCH on a non-existent doc creates it.
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestore(newClass) }),
    });
    
    return newClass;
};

export const addStudentToClass = async (classId: string, studentId: string): Promise<Class> => {
    const res = await fetch(`${BASE_URL}/classes/${classId}?key=${FIREBASE_API_KEY}`);
    if (!res.ok) throw new Error('Class not found');
    const doc = await res.json();
    const currentClass: Class = { id: doc.name.split('/').pop(), ...fromFirestore(doc.fields) };
    
    // Ensure studentIds is an array before pushing
    const studentIds = Array.isArray(currentClass.studentIds) ? currentClass.studentIds : [];

    if (!studentIds.includes(studentId)) {
        studentIds.push(studentId);
    }
    
    const updatedClassData = { ...currentClass, studentIds };

    await fetch(`${BASE_URL}/classes/${classId}?updateMask.fieldPaths=studentIds&key=${FIREBASE_API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestore({ studentIds: updatedClassData.studentIds }) }),
    });

    return updatedClassData;
};

// --- STUDENT DATA API ---
const updateStudentProfile = async (studentId: string, data: StudentData): Promise<void> => {
   await fetch(`${BASE_URL}/studentProfiles/${studentId}?key=${FIREBASE_API_KEY}`, {
        method: 'PATCH', // Using PATCH on a non-existent doc creates it.
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestore(data) }),
    });
};

export const getStudentProfile = async (studentId: string): Promise<StudentData> => {
    const res = await fetch(`${BASE_URL}/studentProfiles/${studentId}?key=${FIREBASE_API_KEY}`);
    if (!res.ok) {
        if (res.status === 404) {
            // If profile doesn't exist, create a default one
             const defaultProfile: StudentData = {
                currentLevel: 1,
                history: [],
                consecutiveFastTrackCount: 0,
            };
            await updateStudentProfile(studentId, defaultProfile);
            return defaultProfile;
        }
        throw new Error('Failed to fetch student profile');
    }
    const doc = await res.json();
    return fromFirestore(doc.fields);
};

export const updateStudentProfileAfterTest = async (studentId: string, attempt: TestAttempt): Promise<StudentData> => {
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

    // Ensure history is an array
    const history = Array.isArray(studentData.history) ? studentData.history : [];

    const newStudentData: StudentData = {
      currentLevel: newLevel,
      history: [...history, attempt],
      consecutiveFastTrackCount: newConsecutiveCount,
    };

    await updateStudentProfile(studentId, newStudentData);
    return newStudentData;
};


// --- LEVEL PARAMS API ---
// These are stored in a single document for simplicity
const CONFIG_DOC_ID = 'appConfig';

export const getLevelParams = async (): Promise<{ levelParamsInt: number[][], levelParamsFrac: number[][] }> => {
    const res = await fetch(`${BASE_URL}/config/${CONFIG_DOC_ID}?key=${FIREBASE_API_KEY}`);
    if (!res.ok) {
         if (res.status === 404) { // Config doesn't exist, create it
            const defaults = {
                levelParamsInt: DEFAULT_LEVEL_PARAMS_INT,
                levelParamsFrac: DEFAULT_LEVEL_PARAMS_FRAC,
            };
            await updateLevelParams(defaults);
            return defaults;
        }
        throw new Error('Failed to fetch level params');
    }
    const doc = await res.json();
    const data = fromFirestore(doc.fields);
    
    // Ensure the data structure is correct, falling back to defaults if needed.
    return {
        levelParamsInt: data.levelParamsInt || DEFAULT_LEVEL_PARAMS_INT,
        levelParamsFrac: data.levelParamsFrac || DEFAULT_LEVEL_PARAMS_FRAC,
    }
};

export const updateLevelParams = async (params: { levelParamsInt?: number[][], levelParamsFrac?: number[][] }): Promise<void> => {
     // We need to specify which fields are being updated for PATCH to work correctly.
     const updateMask = Object.keys(params).map(key => `updateMask.fieldPaths=${key}`).join('&');

     await fetch(`${BASE_URL}/config/${CONFIG_DOC_ID}?${updateMask}&key=${FIREBASE_API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestore(params) }),
    });
};