import { Question, RationalNumber } from '../types';

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

// --- Question Generation based on Python script ---

const addInteger = (params: number[]): Omit<Question, 'id'> => {
    const n1 = getRandomInt(params[3], params[4]);
    const n2 = getRandomInt(params[3], params[4]);
    const answer = n1 + n2;
    return { text: `${n1} + ${n2}`, type: 'integer', answer, operationType: 'add', operands: [n1, n2] };
};

const subtractInteger = (level: number, params: number[]): Omit<Question, 'id'> => {
    let n1 = getRandomInt(params[5], params[6]);
    let n2 = getRandomInt(params[5], params[6]);
    
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
    const n1 = getRandomInt(params[7], params[8]);
    const n2 = getRandomInt(params[7], params[8]);
    const answer = n1 * n2;
    return { text: `${n1} \\times ${n2}`, type: 'integer', answer, operationType: 'mul', operands: [n1, n2] };
};

const divideInteger = (level: number, params: number[]): Omit<Question, 'id'> => {
    const y = (Math.random() < 0.45 && level > 5) ? -1 : 1;
    const bBase = getRandomInt(1, params[10]);
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


export const generateQuestion = (level: number, levelParamsInt: number[][], levelParamsFrac: number[][]): Question => {
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