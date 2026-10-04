PRAGMA foreign_keys = ON;

CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL
);

CREATE TABLE enrolments (
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade INTEGER,
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id)
);

CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);

INSERT INTO students (student_id, name, email) VALUES
    (1, 'Maya Chen', 'maya.chen@example.com'),
    (2, 'Omar Ali', 'omar.ali@example.com'),
    (3, 'Leah Kim', 'leah.kim@example.com');

INSERT INTO courses (course_id, course_name) VALUES
    (101, 'HTML Foundations'),
    (102, 'CSS Foundations'),
    (103, 'JavaScript Foundations');

INSERT INTO enrolments (student_id, course_id, grade) VALUES
    (1, 101, 92),
    (1, 102, 88),
    (1, 103, 95),
    (2, 101, 85),
    (2, 102, NULL),
    (2, 103, 90);

-- 1. All courses for Maya Chen.
SELECT c.course_name
FROM students AS s
JOIN enrolments AS e ON e.student_id = s.student_id
JOIN courses AS c ON c.course_id = e.course_id
WHERE s.name = 'Maya Chen'
ORDER BY c.course_name;

-- 2. All students enrolled in HTML Foundations.
SELECT s.name
FROM courses AS c
JOIN enrolments AS e ON e.course_id = c.course_id
JOIN students AS s ON s.student_id = e.student_id
WHERE c.course_name = 'HTML Foundations'
ORDER BY s.name;

-- 3. Number of students per course, including courses with no enrolments.
SELECT c.course_name, COUNT(e.student_id) AS student_count
FROM courses AS c
LEFT JOIN enrolments AS e ON e.course_id = c.course_id
GROUP BY c.course_id, c.course_name
ORDER BY c.course_id;

-- 4. Students who have no enrolments.
SELECT s.name
FROM students AS s
LEFT JOIN enrolments AS e ON e.student_id = s.student_id
WHERE e.student_id IS NULL
ORDER BY s.name;

-- 5. Update Omar Ali's JavaScript Foundations grade.
UPDATE enrolments
SET grade = 94
WHERE student_id = 2
  AND course_id = 103;

-- 6. Average numeric grade per course; AVG ignores NULL grades.
SELECT c.course_name, AVG(e.grade) AS average_grade
FROM courses AS c
LEFT JOIN enrolments AS e ON e.course_id = c.course_id
GROUP BY c.course_id, c.course_name
ORDER BY c.course_id;
