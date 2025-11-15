import { GoogleGenAI } from "@google/genai";
import { StudentData, TestAttempt, RationalNumber, AnsweredQuestion } from '../types';
import * as api from './mockService';

declare const process: { env: { API_KEY?: string } };

const formatFeaturesForPrompt = (q: AnsweredQuestion): string => {
    const { features, timeTakenSeconds, isCorrect } = q;
    // We don't need to send all features, just the ones for analysis.
    const analysisFeatures = {
        operation: features.operation,
        operandSizeCategory: features.operandSizeCategory,
        requiresCarryOrBorrow: features.requiresCarryOrBorrow,
        questionIndex: features.questionIndex,
        timeIntoTestSeconds: features.timeIntoTestSeconds,
    };
    return `- Correct: ${isCorrect}, Time: ${timeTakenSeconds}s, Features: ${JSON.stringify(analysisFeatures)}`;
}

export async function analyzeStudentHistory(history: TestAttempt[]): Promise<string> {
  if (!process.env.API_KEY) {
    return "Gemini API Key is not configured. Please ensure API_KEY is set in your environment variables.";
  }
  if (history.length === 0) {
    return "No history to analyze.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const formattedHistory = history.map((attempt, index) => {
    const questionsSummary = attempt.answeredQuestions.map(formatFeaturesForPrompt).join('\n');
    return `Test ${index + 1} (Level ${attempt.level}):\n${questionsSummary}`;
  }).join('\n\n');

  try {
    const prompts = await api.getPrompts();
    const finalPrompt = `${prompts.studentAnalysis}\n\nHere is the student's test history:\n${formattedHistory}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: finalPrompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "There was an error analyzing the student's history. Please try again later.";
  }
}

const formatOperands = (operands: (number | RationalNumber)[]): string => {
  return operands.map(op => {
    if (typeof op === 'number') return op.toString();
    return `${op.num}/${op.den}`;
  }).join(', ');
};

export async function analyzeClassForGroupings(
  classStudentsData: { studentName: string; data: StudentData }[]
): Promise<string> {
  if (!process.env.API_KEY) {
    return "Gemini API Key is not configured. Could not analyze class trends.";
  }
  if (classStudentsData.length === 0) {
    return "There are no students in this class to analyze.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const formattedData = classStudentsData
    .map(student => {
        if (!student.data || !student.data.history || student.data.history.length === 0) {
            return `Student: ${student.studentName}\n  - No test history yet.`;
        }
        
        const wrongAnswersSummary = student.data.history
            .flatMap(attempt => attempt.answeredQuestions)
            .filter(q => !q.isCorrect)
            .map(q => `    - Question: ${q.questionText.replace('\\', '')}, Op: ${q.features.operation}, Operands: [${formatOperands(q.operands)}]`)
            .slice(-5) 
            .join('\n');

        if (wrongAnswersSummary.length === 0) {
            return `Student: ${student.studentName} (Current Level: ${student.data.currentLevel})\n  - No recent incorrect answers found.`;
        }

        return `Student: ${student.studentName} (Current Level: ${student.data.currentLevel})\n  - Recent Incorrect Answers:\n${wrongAnswersSummary}`;
    })
    .join('\n\n');

  try {
    const prompts = await api.getPrompts();
    const finalPrompt = `${prompts.classAnalysis}\n\nHere is the data of incorrect answers for the class:\n${formattedData}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: finalPrompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "There was an error analyzing class trends. Please try again later.";
  }
}

export async function analyzeSchoolTrends(
  allStudentsData: { studentName: string; data: StudentData }[]
): Promise<string> {
  if (!process.env.API_KEY) {
    return "Gemini API Key is not configured. Could not analyze school trends.";
  }
  if (allStudentsData.length === 0) {
    return "There are no students in the school to analyze.";
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: finalPrompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "There was an error analyzing school trends. Please try again later.";
  }
}