# Arithmetic Sprint - Deployment Guide

This guide provides instructions for setting up and running the Arithmetic Sprint application in a local development environment.

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

## Note on Gemini API

The features for analyzing student and class performance rely on the Google Gemini API. For these features to work, the application expects an API key to be available in its environment. Please refer to the official documentation for your execution environment on how to provide this.
