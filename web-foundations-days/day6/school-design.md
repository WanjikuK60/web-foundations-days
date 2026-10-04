# School database design

## Tables

- `students` stores each student's ID, name, and email. The ID is the primary
  key, and email is required and unique so the same email cannot identify two
  students.
- `courses` stores each course's ID and required name. The ID is the primary
  key.
- `enrolments` records which student takes which course and that student's
  grade. Its composite primary key (`student_id`, `course_id`) prevents a
  student from enrolling in the same course twice. Both IDs are required
  foreign keys to their parent tables.

## Relationships

Students and enrolments have a one-to-many relationship: a student can have
multiple enrolment records, while each enrolment belongs to one student.
Courses and enrolments also have a one-to-many relationship: a course can have
multiple enrolment records, while each enrolment belongs to one course.
Together, students and courses have a many-to-many relationship because each
student can take multiple courses and each course can have multiple students.
The `enrolments` join table is needed to represent that relationship and to
store relationship-specific data, such as the grade.

## Index

I would add an index on `enrolments(course_id)` to speed up finding students in
a course and counting enrolments per course. The composite primary key starts
with `student_id`, so it does not provide the same efficient lookup by
`course_id`. The SQL script creates this index.

## SQL or NoSQL?

I would choose a relational SQL database for this system. Students, courses,
and enrolments have clear relationships, and foreign keys and uniqueness
constraints protect data integrity. SQL joins make it straightforward to
answer questions such as which students take a course and how many students
each course has. A NoSQL database could work, but would need more application
logic or duplicated data to maintain these relationships and constraints.
