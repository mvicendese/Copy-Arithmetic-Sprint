import { GoogleGenAI } from "@google/genai";
import { StudentData, TestAttempt, RationalNumber } from '../types';
import * as api from './mockService';

declare const process: { env: { API_KEY?: string } };

const formatOperands = (operands: (number | RationalNumber)[]): string => {
  return operands.map(op => {
    if (typeof op === 'number') return op.toString();
    return `${op.num}/${op.den}`;
  }).join(', ');
};

export async function analyzeStudentHistory(
  history: TestAttempt[],
  onChunk: (chunk: string) => void
): Promise<void> {
  if (!process.env.API_KEY) {
    throw new Error("Gemini API Key is not configured. Please ensure API_KEY is set in your environment variables.");
  }
  if (history.length === 0) {
    onChunk("No history to analyze.");
    return;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const formattedHistory = history.map((attempt, index) => {
    const questionsSummary = attempt.answeredQuestions.map(q => 
      `- Q: "${q.questionText.replace(' = ?', '')}", Ans: "${q.submittedAnswer}", Correct: ${q.isCorrect}, Time: ${q.timeTakenSeconds}s, Op: ${q.operationType}, Operands: [${formatOperands(q.operands)}]`
    ).join('\n');
    return `Test ${index + 1} (Level ${attempt.level}):\n${questionsSummary}`;
  }).join('\n\n');

  try {
    const prompts = await api.getPrompts();
    const finalPrompt = `${prompts.studentAnalysis}\n\nHere is the student's test history:\n${formattedHistory}`;
    
    const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: finalPrompt,
    });
    for await (const chunk of response) {
      onChunk(chunk.text);
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("There was an error analyzing the student's history. Please try again later.");
  }
}


export async function analyzeClassForGroupings(
  classStudentsData: { studentName: string; data: StudentData }[],
  onChunk: (chunk: string) => void
): Promise<void> {
  if (!process.env.API_KEY) {
    throw new Error("Gemini API Key is not configured. Could not analyze class trends.");
  }
  if (classStudentsData.length === 0) {
    onChunk("There are no students in this class to analyze.");
    return;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const formattedData = classStudentsData
    .map(student => {
        if (!student.data || !student.data.history || student.data.history.length === 0) {
            return `Student: ${student.studentName}\n  - No test history yet.`;
        }
        
        // UPDATED LOGIC: Provide context by including the test level for each incorrect answer.
        // This allows the AI to understand the difficulty of the question the student missed.
        const wrongAnswersSummary = student.data.history
            .slice(-3) // Look at the three most recent tests
            .flatMap(attempt => 
                attempt.answeredQuestions
                    .filter(q => !q.isCorrect)
                    .map(q => ({ question: q, level: attempt.level })) // Pass level along
            )
            .map(({ question: q, level }) => `    - (On a Level ${level} test) Question: ${q.questionText.replace(/\\/g, '')}, Op: ${q.operationType}, Operands: [${formatOperands(q.operands)}]`)
            .join('\n');


        if (wrongAnswersSummary.length === 0) {
            return `Student: ${student.studentName} (Current Level: ${student.data.currentLevel})\n  - No incorrect answers in the last 3 tests.`;
        }

        return `Student: ${student.studentName} (Current Level: ${student.data.currentLevel})\n  - Recent Incorrect Answers:\n${wrongAnswersSummary}`;
    })
    .join('\n\n');

  try {
    const prompts = await api.getPrompts();
    const finalPrompt = `${prompts.classAnalysis}\n\nHere is the data of incorrect answers for the class:\n${formattedData}`;
    
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: finalPrompt,
    });
    for await (const chunk of response) {
        onChunk(chunk.text);
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("There was an error analyzing class trends. Please try again later.");
  }
}

export async function analyzeSchoolTrends(
  allStudentsData: { studentName: string; data: StudentData }[],
  onChunk: (chunk: string) => void
): Promise<void> {
  if (!process.env.API_KEY) {
    throw new Error("Gemini API Key is not configured. Could not analyze school trends.");
  }
  if (allStudentsData.length === 0) {
    onChunk("There are no students in the school to analyze.");
    return;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const formattedData = allStudentsData
    .map(student => {
      if (!student.data) return null;
      return ` - ${student.studentName}: Level ${student.data.currentLevel}`;
    })
    .filter(Boolean)
    .join('\n');
    
  try {
    const prompts = await api.getPrompts();
    const finalPrompt = `${prompts.schoolAnalysis}\n\nHere is the list of all students and their current levels:\n${formattedData}`;

    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: finalPrompt,
    });
    for await (const chunk of response) {
        onChunk(chunk.text);
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("There was an error analyzing school trends. Please try again later.");
  }
}