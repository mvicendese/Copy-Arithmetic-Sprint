
import { Question, RationalNumber } from '../types';
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

// NEW HELPER to avoid generating zeros for addition/subtraction
const getRandomNonZeroInt = (min: number, max: number): number => {
    // If the range doesn't include 0, or is only 0, no special logic needed
    if (min > 0 || max < 0 || (min === 0 && max === 0)) {
        return getRandomInt(min, max);
    }
    
    let num;
    do {
        num = getRandomInt(min, max);
    } while (num === 0);
    return num;
};


// --- Question Generation based on Python script ---

const addInteger = (params: number[]): Omit<Question, 'id'> => {
    // UPDATED: Use getRandomNonZeroInt to prevent adding by zero
    const n1 = getRandomNonZeroInt(params[3], params[4]);
    const n2 = getRandomNonZeroInt(params[3], params[4]);
    const answer = n1 + n2;
    return { text: `${n1} + ${n2}`, type: 'integer', answer, operationType: 'add', operands: [n1, n2] };
};

const subtractInteger = (level: number, params: number[]): Omit<Question, 'id'> => {
    // UPDATED: Use getRandomNonZeroInt to prevent subtracting by zero
    let n1 = getRandomNonZeroInt(params[5], params[6]);
    let n2 = getRandomNonZeroInt(params[5], params[6]);
    
    if (level < 6) {
        // This logic ensures a positive result where the answer is one of the original numbers
        const originalN1 = n1;
        n1 = n1 + n2;
        const answer = originalN1;
        return { text: `${n1} - ${n2}`, type: 'integer', answer, operationType: 'sub', operands: [n1, n2] };
    }
    
    const answer = n1 - n2;
    return { text: `${n1} - ${n2}`, type: 'integer', answer, operationType: 'sub', operands: [n1, n2] };
};

const multiplyInteger = (params: number[]): Omit<Question, 'id'> => {
    let n1 = getRandomInt(params[7], params[8]);
    let n2 = getRandomInt(params[7], params[8]);

    // UPDATED: Reduce the chance of multiplying by 1 or -1 to make it rare
    if (Math.abs(n1) === 1 || Math.abs(n2) === 1) {
        if (Math.random() < 0.75) { // 75% chance to reroll
            const min = params[7];
            const max = params[8];
            // Ensure reroll is possible and won't be an infinite loop
            if (max > min) {
                 do {
                    n1 = getRandomInt(min, max);
                    n2 = getRandomInt(min, max);
                } while (Math.abs(n1) === 1 || Math.abs(n2) === 1);
            }
        }
    }

    const answer = n1 * n2;
    return { text: `${n1} \\times ${n2}`, type: 'integer', answer, operationType: 'mul', operands: [n1, n2] };
};

const divideInteger = (level: number, params: number[]): Omit<Question, 'id'> => {
    const y = (Math.random() < 0.45 && level > 5) ? -1 : 1;
    let bBase = getRandomInt(1, params[10]);
    
    // UPDATED: Reduce the chance of dividing by 1 or -1
    if (bBase === 1 && params[10] > 1) { // Check if rerolling is possible
        if (Math.random() < 0.75) { // 75% chance to reroll
            do {
                bBase = getRandomInt(1, params[10]);
            } while (bBase === 1);
        }
    }

    const randInt = getRandomInt(params[9], params[10]);
    const n1 = bBase * params[11] * randInt;
    const n2 = bBase * y;
    const answer = Math.floor(n1 / n2);
    return { text: `${n1} \\div ${n2}`, type: 'integer', answer, operationType: 'div', operands: [n1, n2] };
};

const generateFraction = (max: number): RationalNumber => {
    const num = getRandomInt(1, max);
    const den = num + getRandomInt(1, max);
    return { num, den };
};

const addFraction = (params: number[]): Omit<Question, 'id'> => {
    const max = params[4];
    const r1 = generateFraction(max);
    const r2 = generateFraction(max);
    const result = { num: r1.num * r2.den + r2.num * r1.den, den: r1.den * r2.den };
    const answer = simplifyFraction(result);
    return { text: `\\frac{${r1.num}}{${r1.den}} + \\frac{${r2.num}}{${r2.den}}`, type: 'rational', answer, operationType: 'add', operands: [r1, r2] };
};

const subtractFraction = (params: number[]): Omit<Question, 'id'> => {
    const max = params[4];
    const r1 = generateFraction(max);
    const r2 = generateFraction(max);
    const result = { num: r1.num * r2.den - r2.num * r1.den, den: r1.den * r2.den };
    const answer = simplifyFraction(result);
    return { text: `\\frac{${r1.num}}{${r1.den}} - \\frac{${r2.num}}{${r2.den}}`, type: 'rational', answer, operationType: 'sub', operands: [r1, r2] };
};

const multiplyFraction = (params: number[]): Omit<Question, 'id'> => {
    const max = params[4];
    const r1 = generateFraction(max);
    const r2 = generateFraction(max);
    const result = { num: r1.num * r2.num, den: r1.den * r2.den };
    const answer = simplifyFraction(result);
    return { text: `\\frac{${r1.num}}{${r1.den}} \\times \\frac{${r2.num}}{${r2.den}}`, type: 'rational', answer, operationType: 'mul', operands: [r1, r2] };
};

const divideFraction = (params: number[]): Omit<Question, 'id'> => {
    const max = params[4];
    const r1 = generateFraction(max);
    const r2 = generateFraction(max);
    const result = { num: r1.num * r2.den, den: r1.den * r2.num };
    const answer = simplifyFraction(result);
    return { text: `\\frac{${r1.num}}{${r1.den}} \\div \\frac{${r2.num}}{${r2.den}}`, type: 'rational', answer, operationType: 'div', operands: [r1, r2] };
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

// HELPER: Generates a unique key for a question to detect duplicates and commutative equivalents.
const getQuestionKey = (q: Question): string => {
    const op = q.operationType;
    // Standardize operand representation for the key
    const operandsAsStrings = q.operands.map(o => {
        if (typeof o === 'number') return o.toString();
        // Simplify fraction before creating key to handle e.g. 2/4 vs 1/2
        const simplified = simplifyFraction(o);
        return `${simplified.num}/${simplified.den}`;
    });

    // For commutative operations, sort operands to treat 'a+b' and 'b+a' as the same.
    if (op === 'add' || op === 'mul') {
        operandsAsStrings.sort();
    }
    return `${op}:${operandsAsStrings.join(',')}`;
}


// Generates a full, unique set of test questions.
export const generateTestQuestions = (level: number, levelParamsInt: number[][], levelParamsFrac: number[][]): Question[] => {
    const questions: Question[] = [];
    const questionKeys = new Set<string>();
    const answerKeys = new Set<string>();

    // Increased safeguard due to tighter constraints (unique questions AND answers)
    const maxAttempts = TOTAL_QUESTIONS * 25; 
    let attempts = 0;

    // --- Phase 1: Try to generate questions with unique questions AND unique answers ---
    while (questions.length < TOTAL_QUESTIONS && attempts < maxAttempts) {
        const newQuestion = generateSingleQuestion(level, levelParamsInt, levelParamsFrac);
        const questionKey = getQuestionKey(newQuestion);
        
        let answerKey: string;
        if (newQuestion.type === 'integer') {
            answerKey = (newQuestion.answer as number).toString();
        } else {
            const rationalAnswer = newQuestion.answer as RationalNumber; // Already simplified
            answerKey = `${rationalAnswer.num}/${rationalAnswer.den}`;
        }
        
        if (!questionKeys.has(questionKey) && !answerKeys.has(answerKey)) {
            questionKeys.add(questionKey);
            answerKeys.add(answerKey);
            questions.push(newQuestion);
        }
        attempts++;
    }

    // --- Phase 2: If Phase 1 failed, try to fill with at least unique questions ---
    if (questions.length < TOTAL_QUESTIONS) {
        console.warn(`Could not generate ${TOTAL_QUESTIONS} unique questions with unique answers for level ${level}. Generated ${questions.length}. Relaxing constraints to find unique questions.`);
        
        const fallbackAttempts = maxAttempts * 2;
        while (questions.length < TOTAL_QUESTIONS && attempts < fallbackAttempts) {
             const newQuestion = generateSingleQuestion(level, levelParamsInt, levelParamsFrac);
             const key = getQuestionKey(newQuestion);
             if (!questionKeys.has(key)) {
                questionKeys.add(key);
                questions.push(newQuestion);
             }
             attempts++;
        }
    }
    
    // --- Phase 3: If all else fails, fill with duplicates to meet the total count ---
    if (questions.length < TOTAL_QUESTIONS) {
        console.warn(`Could not generate ${TOTAL_QUESTIONS} unique questions. Filling remaining slots with potential duplicates.`);
        while (questions.length < TOTAL_QUESTIONS) {
             questions.push(generateSingleQuestion(level, levelParamsInt, levelParamsFrac));
        }
    }

    return questions;
};
