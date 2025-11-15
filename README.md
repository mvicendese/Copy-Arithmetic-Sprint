# Arithmetic Sprint - Local Development Guide

This is an adaptive, timed arithmetic test for students. This version of the application runs entirely in your browser and does not require a backend service like Firebase.

## Features

-   **Adaptive Learning:** Questions adjust to the student's skill level.
-   **Multi-User System:** Separate views for Admins, Teachers, and Students.
-   **Class Management:** Teachers can create classes and manage students.
-   **AI-Powered Feedback:** Uses the Gemini API to analyze student performance and provide actionable insights for teachers and students.
-   **Local-First:** All data is stored in-memory, making it easy to run and test without any database setup. The data will reset when you close the browser tab.

---

## How to Run the Application

1.  **Install Dependencies:**
    Open a terminal in the project's root directory and run:
    ```bash
    npm install
    ```

2.  **Start the Development Server:**
    After the installation is complete, run:
    ```bash
    npm run dev
    ```

3.  **Open in Browser:**
    The terminal will show a local URL, usually `http://localhost:5173`. Open this URL in your web browser to use the application.

## User Accounts for Testing

The local mock database is pre-populated with the following users:

-   **Admin:**
    -   Username: `admin@sprint.com`
    -   Password: `admin`
-   **Teachers:**
    -   Username format: `teach[A-C]@sprint.com` (e.g., `teachA@sprint.com`, `teachB@sprint.com`)
    -   Password: `password` (for all teachers)
-   **Students:**
    -   Username format: `student.[TeacherChar][ClassChar][Number]` (e.g., `student.aa1`, `student.ab15`, `student.cc5`)
    -   Password: `password` (for all students)

## Note on Gemini API

The features for analyzing student and class performance rely on the Google Gemini API. For these features to work, the application expects an API key to be available in its environment. Please refer to the official documentation for your execution environment on how to provide this.