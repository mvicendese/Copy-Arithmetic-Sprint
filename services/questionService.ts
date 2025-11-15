import { Question, RationalNumber, QuestionFeatures } from '../types';
import { TOTAL_QUESTIONS } from '../constants';

// --- Math Helpers ---
const gcd = (a: number, b: number): number => {
  return b === 0 ? a : gcd(b, a % b);
};

const simplifyFraction = (rational: RationalNumber): RationalNumber => {
  if (rational.den === 0) throw new Error("Denominator cannot be zero.");
  if (rational.num === 0) return { num: 0, den: 1 };
  
  const commonDivisor = gcd(Math.abs(rational.num), Math.abs(rational.den));
  const num = rational.num / commonDivisor;
  const den = rational.den / commonDivisor;

  return den < 0 ? { num: -num, den: -den } : { num, den };
};

const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomNonZeroInt = (min: number, max: number): number => {
    if (min > 0 || max < 0 || (min === 0 && max === 0)) {
        return getRandomInt(min, max);
    }
    
    let num;
    do {
        num = getRandomInt(min, max);
    } while (num === 0);
    return num;
};


// --- Feature Extraction Helpers ---

const requiresCarry = (n1: number, n2: number): boolean => {
    if (!Number.isInteger(n1) || !Number.isInteger(n2)) return false;
    // Simplification: only check for positive numbers for now
    if (n1 < 0 || n2 < 0) return false;

    let s1 = String(n1);
    let s2 = String(n2);
    let carry = 0;
    let i = s1.length - 1;
    let j = s2.length - 1;

    while (i >= 0 || j >= 0 || carry > 0) {
        const d1 = i >= 0 ? parseInt(s1[i--]) : 0;
        const d2 = j >= 0 ? parseInt(s2[j--]) : 0;
        const sum = d1 + d2 + carry;
        if (sum >= 10 && (i >= -1 || j >= -1)) { // check if not on the very last digit
            return true;
        }
        carry = Math.floor(sum / 10);
    }
    return false;
}

const requiresBorrow = (n1: number, n2: number): boolean => {
    if (!Number.isInteger(n1) || !Number.isInteger(n2)) return false;
    // Simplification: only check for standard n1 > n2 > 0 cases
    if (n1 < n2 || n1 < 0 || n2 < 0) return false;
    
    let s1 = String(n1);
    let s2 = String(n2);
    let i = s1.length - 1;
    let j = s2.length - 1;
    
    while (j >= 0) {
        const d1 = parseInt(s1[i--]);
        const d2 = parseInt(s2[j--]);
        if (d1 < d2) {
            return true;
        }
    }
    return false;
}

const getOperandSizeCategory = (operands: (number | RationalNumber)[]): QuestionFeatures['operandSizeCategory'] => {
    const isNumber = (op: any): op is number => typeof op === 'number';
    if (!operands.every(isNumber)) return 'fractions';
    
    const numOps = operands as number[];
    const isSingle = (n: number) => Math.abs(n) < 10;
    
    if (numOps.every(isSingle)) return 'single-digit';
    if (numOps.every(n => !isSingle(n))) return 'double-digit';
    return 'mixed-digits';
}


// --- Question Generation based on Python script ---

const addInteger = (params: number[]): Omit<Question, 'id'> => {
    const n1 = getRandomNonZeroInt(params[3], params[4]);
    const n2 = getRandomNonZeroInt(params[3], params[4]);
    const answer = n1 + n2;
    return { 
        text: `${n1} + ${n2}`, type: 'integer', answer, operands: [n1, n2],
        features: {
            operation: 'add',
            operandSizeCategory: getOperandSizeCategory([n1, n2]),
            requiresCarryOrBorrow: requiresCarry(n1, n2),
        }
    };
};

const subtractInteger = (level: number, params: number[]): Omit<Question, 'id'> => {
    let n1 = getRandomNonZeroInt(params[5], params[6]);
    let n2 = getRandomNonZeroInt(params[5], params[6]);
    let text: string;
    let answer: number;
    let finalN1: number, finalN2: number;

    if (level < 6) {
        const originalN1 = n1;
        finalN1 = n1 + n2;
        finalN2 = n2;
        answer = originalN1;
        text = `${finalN1} - ${finalN2}`;
    } else {
        finalN1 = n1;
        finalN2 = n2;
        answer = n1 - n2;
        text = `${n1} - ${n2}`;
    }
    
    return { 
        text, type: 'integer', answer, operands: [finalN1, finalN2],
        features: {
            operation: 'sub',
            operandSizeCategory: getOperandSizeCategory([finalN1, finalN2]),
            requiresCarryOrBorrow: requiresBorrow(finalN1, finalN2),
        }
    };
};

const multiplyInteger = (params: number[]): Omit<Question, 'id'> => {
    let n1 = getRandomInt(params[7], params[8]);
    let n2 = getRandomInt(params[7], params[8]);

    if (Math.abs(n1) === 1 || Math.abs(n2) === 1) {
        if (Math.random() < 0.75) {
            const min = params[7];
            const max = params[8];
            if (max > min) {
                 do {
                    n1 = getRandomInt(min, max);
                    n2 = getRandomInt(min, max);
                } while (Math.abs(n1) === 1 || Math.abs(n2) === 1);
            }
        }
    }

    const answer = n1 * n2;
    return { 
        text: `${n1} \\times ${n2}`, type: 'integer', answer, operands: [n1, n2],
        features: {
            operation: 'mul',
            operandSizeCategory: getOperandSizeCategory([n1, n2]),
            requiresCarryOrBorrow: false, // Not applicable
        }
    };
};

const divideInteger = (level: number, params: number[]): Omit<Question, 'id'> => {
    const y = (Math.random() < 0.45 && level > 5) ? -1 : 1;
    let bBase = getRandomInt(1, params[10]);
    
    if (bBase === 1 && params[10] > 1) {
        if (Math.random() < 0.75) {
            do {
                bBase = getRandomInt(1, params[10]);
            } while (bBase === 1);
        }
    }

    const randInt = getRandomInt(params[9], params[10]);
    const n1 = bBase * params[11] * randInt;
    const n2 = bBase * y;
    const answer = Math.floor(n1 / n2);
    return { 
        text: `${n1} \\div ${n2}`, type: 'integer', answer, operands: [n1, n2],
        features: {
            operation: 'div',
            operandSizeCategory: getOperandSizeCategory([n1, n2]),
            requiresCarryOrBorrow: false, // Not applicable
        }
    };
};

const generateFraction = (max: number): RationalNumber => {
    const num = getRandomInt(1, max);
    const den = num + getRandomInt(1, max);
    return { num, den };
};

const createFractionQuestion = (
    op: 'add' | 'sub' | 'mul' | 'div', 
    text: string, 
    answer: RationalNumber, 
    operands: RationalNumber[]
): Omit<Question, 'id'> => ({
    text, type: 'rational', answer, operands,
    features: {
        operation: op,
        operandSizeCategory: 'fractions',
        requiresCarryOrBorrow: false, // Not applicable
    }
});


const addFraction = (params: number[]): Omit<Question, 'id'> => {
    const max = params[4];
    const r1 = generateFraction(max);
    const r2 = generateFraction(max);
    const result = { num: r1.num * r2.den + r2.num * r1.den, den: r1.den * r2.den };
    const answer = simplifyFraction(result);
    const text = `\\frac{${r1.num}}{${r1.den}} + \\frac{${r2.num}}{${r2.den}}`;
    return createFractionQuestion('add', text, answer, [r1, r2]);
};

const subtractFraction = (params: number[]): Omit<Question, 'id'> => {
    const max = params[4];
    const r1 = generateFraction(max);
    const r2 = generateFraction(max);
    const result = { num: r1.num * r2.den - r2.num * r1.den, den: r1.den * r2.den };
    const answer = simplifyFraction(result);
    const text = `\\frac{${r1.num}}{${r1.den}} - \\frac{${r2.num}}{${r2.den}}`;
    return createFractionQuestion('sub', text, answer, [r1, r2]);
};

const multiplyFraction = (params: number[]): Omit<Question, 'id'> => {
    const max = params[4];
    const r1 = generateFraction(max);
    const r2 = generateFraction(max);
    const result = { num: r1.num * r2.num, den: r1.den * r2.den };
    const answer = simplifyFraction(result);
    const text = `\\frac{${r1.num}}{${r1.den}} \\times \\frac{${r2.num}}{${r2.den}}`;
    return createFractionQuestion('mul', text, answer, [r1, r2]);
};

const divideFraction = (params: number[]): Omit<Question, 'id'> => {
    const max = params[4];
    const r1 = generateFraction(max);
    const r2 = generateFraction(max);
    const result = { num: r1.num * r2.den, den: r1.den * r2.num };
    const answer = simplifyFraction(result);
    const text = `\\frac{${r1.num}}{${r1.den}} \\div \\frac{${r2.num}}{${r2.den}}`;
    return createFractionQuestion('div', text, answer, [r1, r2]);
};


const generateSingleQuestion = (level: number, levelParamsInt: number[][], levelParamsFrac: number[][]): Question => {
    let questionData: Omit<Question, 'id'>;
    const isFractionLevel = level > 10;
    const fracLevelParams = isFractionLevel ? levelParamsFrac[level - 11] : [];
    const isIntegerQuestion = isFractionLevel ? Math.random() < fracLevelParams[0] : true;

    if (isIntegerQuestion) {
        const x = Math.random();
        const params = levelParamsInt[level - 1];
        if (x < params[0]) {
            questionData = addInteger(params);
        } else if (x < params[1]) {
            questionData = subtractInteger(level, params);
        } else if (x < params[2]) {
            questionData = multiplyInteger(params);
        } else {
            questionData = divideInteger(level, params);
        }
    } else { // Fraction Question
        const x = Math.random();
        const params = fracLevelParams;
        if (x < params[1]) {
            questionData = addFraction(params);
        } else if (x < params[2]) {
            questionData = subtractFraction(params);
        } else if (x < params[3]) {
            questionData = multiplyFraction(params);
        } else {
            questionData = divideFraction(params);
        }
    }

  return { id: crypto.randomUUID(), ...questionData };
};

const getQuestionKey = (q: Question): string => {
    const op = q.features.operation;
    const operandsAsStrings = q.operands.map(o => {
        if (typeof o === 'number') return o.toString();
        const simplified = simplifyFraction(o);
        return `${simplified.num}/${simplified.den}`;
    });

    if (op === 'add' || op === 'mul') {
        operandsAsStrings.sort();
    }
    return `${op}:${operandsAsStrings.join(',')}`;
}


export const generateTestQuestions = (level: number, levelParamsInt: number[][], levelParamsFrac: number[][]): Question[] => {
    const questions: Question[] = [];
    const keys = new Set<string>();
    
    const maxAttempts = TOTAL_QUESTIONS * 15;
    let attempts = 0;

    while (questions.length < TOTAL_QUESTIONS && attempts < maxAttempts) {
        const newQuestion = generateSingleQuestion(level, levelParamsInt, levelParamsFrac);
        const key = getQuestionKey(newQuestion);
        
        if (!keys.has(key)) {
            keys.add(key);
            questions.push(newQuestion);
        }
        attempts++;
    }

    if (questions.length < TOTAL_QUESTIONS) {
        console.warn(`Could not generate ${TOTAL_QUESTIONS} unique questions for level ${level}. Generated ${questions.length}. Filling with non-unique questions.`);
        while (questions.length < TOTAL_QUESTIONS) {
             questions.push(generateSingleQuestion(level, levelParamsInt, levelParamsFrac));
        }
    }

    return questions;
};