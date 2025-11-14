

import { GoogleGenAI } from "@google/genai";
import { StudentData, TestAttempt, RationalNumber } from '../types';

// Per @google/genai guidelines, API key must come from process.env.API_KEY.
// We declare process here to satisfy TypeScript in a browser environment,
// assuming the execution context will provide it.
declare const process: { env: { API_KEY?: string } };

const formatOperands = (operands: (number | RationalNumber)[]): string => {
  return operands.map(op => {
    if (typeof op === 'number') return op.toString();
    return `${op.num}/${op.den}`;
  }).join(', ');
};

export async function analyzeStudentHistory(history: TestAttempt[]): Promise<string> {
  // Fix: Adhere to Gemini API guidelines by using process.env.API_KEY
  if (!process.env.API_KEY) {
    return "Gemini API Key is not configured. Please ensure API_KEY is set in your environment variables.";
  }
  if (history.length === 0) {
    return "No history to analyze.";
  }

  // Fix: Adhere to Gemini API guidelines for initialization
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const formattedHistory = history.map((attempt, index) => {
    const questionsSummary = attempt.answeredQuestions.map(q => 
      `- Q: "${q.questionText.replace(' = ?', '')}", Ans: "${q.submittedAnswer}", Correct: ${q.isCorrect}, Time: ${q.timeTakenSeconds}s, Op: ${q.operationType}, Operands: [${formatOperands(q.operands)}]`
    ).join('\n');
    return `Test ${index + 1} (Level ${attempt.level}):\n${questionsSummary}`;
  }).join('\n\n');

  const prompt = `
    You are an expert data analyst and math tutor. You will be given the complete test history for a student in an arithmetic practice app. Your task is to provide a detailed, insightful, and actionable summary for a teacher.

    The data is structured as a series of tests. For each test, you'll see a list of every question answered, the student's answer, whether it was correct, the time taken, the operation type (add, sub, mul, div), and the specific numbers (operands) used in the question.

    Based on the ENTIRE history, provide a deep analysis covering the following points. Use markdown for clear formatting.

    1.  **Overall Summary:**
        *   A brief, high-level overview of the student's progress, strengths, and primary areas for improvement.

    2.  **Analysis by Operation:**
        *   **Addition & Subtraction:**
            *   How accurate are they with these operations?
            *   Do they struggle with negative numbers?
            *   **CRITICAL:** Analyze their performance with numbers near a multiple of 10 (e.g., adding 9, 19, 21; subtracting 8, 18). Do they make common mistakes here? Suggest teaching strategies like "add 10 and subtract 1" if you see this pattern.
        *   **Multiplication & Division:**
            *   How accurate are they?
            *   **CRITICAL:** Identify specific times tables that are causing problems. Look at the operands from incorrect multiplication/division questions. For example, if they consistently miss questions involving 7s or 8s, point this out directly (e.g., "The student needs to practice their 7 and 8 times tables.").

    3.  **Analysis by Number Size:**
        *   Does the student's accuracy decrease as the numbers get larger (e.g., double-digit vs. single-digit)?
        *   Are there specific ranges of numbers (e.g., teens) that are problematic?

    4.  **Speed vs. Accuracy:**
        *   Identify which types of questions they answer fastest and slowest.
        *   Is there a negative correlation? Are they rushing and making careless errors on simpler problems? Or are they slow but accurate? Provide specific examples.

    Synthesize these points into a comprehensive report for the teacher. Be specific, use examples from the data, and provide concrete, actionable recommendations.

    Here is the student's test history:
    ${formattedHistory}
  `;


  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "There was an error analyzing the student's history. Please try again later.";
  }
}


export async function analyzeClassTrends(
  classStudentsData: { studentName: string; data: StudentData }[],
  totalQuestions: number
): Promise<string> {
  // Fix: Adhere to Gemini API guidelines by using process.env.API_KEY
  if (!process.env.API_KEY) {
    return "Gemini API Key is not configured. Could not analyze class trends.";
  }
  if (classStudentsData.length === 0) {
    return "There are no students in this class to analyze.";
  }

  // Fix: Adhere to Gemini API guidelines for initialization
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const formattedData = classStudentsData
    .map(student => {
      if (!student.data || student.data.history.length === 0) {
        return `Student: ${student.studentName}\n  - No test history yet.`;
      }
      const historySummary = student.data.history
        .map(attempt => `  - Lvl ${attempt.level}: ${attempt.correctCount}/${totalQuestions} correct`)
        .join('\n');
      return `Student: ${student.studentName} (Current Level: ${student.data.currentLevel})\n${historySummary}`;
    })
    .join('\n\n');

  const prompt = `
    You are an expert data analyst and math tutor. You will be given a summary of test histories for an entire class of students. Your task is to provide a high-level summary of class-wide trends for the teacher.

    The data is structured as a list of students, each with their current level and a summary of their past test attempts (level and score).

    Based on the aggregated data, analyze the following:
    1.  **Overall Performance:** How is the class performing as a whole? Are most students progressing well, or are many struggling?
    2.  **Student Grouping:** Identify groups of students based on their current level and progress. Are there high-flyers who are advancing quickly? Is there a group in the middle? Is there a group that seems stuck on a certain level?
    3.  **Actionable Insights:** Based on the groups, suggest what the teacher could do. For example: "The top group (mention names) seems ready for more challenging material. The group struggling around level 5 (mention names) might benefit from a review of negative numbers."

    Synthesize these points into a concise, actionable summary for the teacher. Focus on the big picture and group trends. Be encouraging and constructive.

    Here is the class data:
    ${formattedData}
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "There was an error analyzing class trends. Please try again later.";
  }
}
