# Arithmetic Sprint - User Guide

This document lists the pre-populated user accounts available for testing the application and explains how to log in.

## User Accounts for Testing

The local mock database is pre-populated with the following users:

### Admin

-   **Username:** `admin@sprint.com`
-   **Password:** `admin`

### Teachers

There are three teachers created, following a simple naming convention.

-   **Username format:** `teach[A-C]@sprint.com`
    -   Example 1: `teachA@sprint.com`
    -   Example 2: `teachB@sprint.com`
    -   Example 3: `teachC@sprint.com`
-   **Password:** `password` (for all teachers)

### Students

There are 15 students per class, with three classes per teacher. The username is derived from their name, which follows a pattern based on their teacher and class.

-   **Username format:** `student.[TeacherChar][ClassChar][Number]`
    -   To log in, use the student's first name and surname separated by a period.
    -   Example 1 (Teacher A, Class a, Student 1): `student.aa1`
    -   Example 2 (Teacher B, Class c, Student 12): `student.bc12`
    -   Example 3 (Teacher C, Class a, Student 5): `student.ca5`
-   **Password:** `password` (for all students)
