

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


export async function analyzeClassForGroupings(
  classStudentsData: { studentName: string; data: StudentData }[]
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
        if (!student.data || !student.data.history || student.data.history.length === 0) {
            return `Student: ${student.studentName}\n  - No test history yet.`;
        }
        
        const wrongAnswersSummary = student.data.history
            .flatMap(attempt => attempt.answeredQuestions)
            .filter(q => !q.isCorrect)
            .map(q => `    - Question: ${q.questionText.replace('\\', '')}, Op: ${q.operationType}, Operands: [${formatOperands(q.operands)}]`)
            .slice(-5) // Take last 5 wrong answers per student to keep prompt manageable
            .join('\n');

        if (wrongAnswersSummary.length === 0) {
            return `Student: ${student.studentName} (Current Level: ${student.data.currentLevel})\n  - No recent incorrect answers found.`;
        }

        return `Student: ${student.studentName} (Current Level: ${student.data.currentLevel})\n  - Recent Incorrect Answers:\n${wrongAnswersSummary}`;
    })
    .join('\n\n');

  const prompt = `
    You are an expert educational analyst. You are given data on students' recent incorrect answers in an arithmetic test. Your task is to identify common weaknesses and group students to help a teacher form small support groups.

    Based on the provided data:
    1.  **Identify Common Weakness Themes:** Look for recurring error patterns across multiple students. Examples could be: specific times tables (e.g., errors in questions involving 7s, 8s), operations with negative numbers, subtraction that requires borrowing, or specific fraction operations.
    2.  **Group Students:** List the identified themes as clear, bolded markdown headers (e.g., **Difficulty with Negative Numbers**). Under each header, list the names of the students who exhibit that weakness. A student can appear in multiple groups.
    3.  **Provide Actionable Advice:** For each group, give a brief, concrete suggestion for a small group activity or focus area.
    4.  **Acknowledge Strong Students:** If any students have no recent errors, list them under a "Confident Students" group who may not need immediate intervention.

    Your output should be well-formatted using markdown.

    Here is the data of incorrect answers for the class:
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

export async function analyzeSchoolTrends(
  allStudentsData: { studentName: string; data: StudentData }[]
): Promise<string> {
  // Fix: Adhere to Gemini API guidelines by using process.env.API_KEY
  if (!process.env.API_KEY) {
    return "Gemini API Key is not configured. Could not analyze school trends.";
  }
  if (allStudentsData.length === 0) {
    return "There are no students in the school to analyze.";
  }

  // Fix: Adhere to Gemini API guidelines for initialization
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const formattedData = allStudentsData
    .map(student => {
      if (!student.data) return null;
      return ` - ${student.studentName}: Level ${student.data.currentLevel}`;
    })
    .filter(Boolean)
    .join('\n');
    
  const prompt = `
    You are an expert data analyst for a school administrator. You are given a list of all students in the school and their current math level in an adaptive arithmetic program. Your task is to provide a high-level executive summary of the school's overall performance.

    Based on the provided list of student levels:
    1.  **Overall Distribution:** Briefly describe the distribution of students across the levels. Are most students at the beginner (1-5), intermediate (6-12), or advanced (13+) levels?
    2.  **Identify At-Risk Cohorts:** Identify any significant groups of students who are clustered at lower levels. This could indicate a school-wide or grade-wide gap in foundational knowledge. Mention the level ranges where students seem to be "stuck".
    3.  **Identify High-Achievers:** Acknowledge the group of students who are progressing to the highest levels, as they may need further enrichment.
    4.  **Actionable Recommendations:** Suggest broad, school-level interventions. For example: "A significant number of students are struggling with levels 4-6, which focus on negative numbers. Consider organizing cross-class workshops on this topic." or "The students at the highest levels could be challenged with a math club or advanced projects."

    Be concise, use markdown for formatting, and focus on the big picture to help the administrator allocate resources effectively.

    Here is the list of all students and their current levels:
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
    return "There was an error analyzing school trends. Please try again later.";
  }
}
