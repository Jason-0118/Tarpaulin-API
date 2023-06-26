# Tarpaulin-API

## Teammates
- [Gavin Gutowsky](https://github.com/GavinGutowsky)
- [Zhan ZhaoHong](https://github.com/Harvey5678)
- [Wang HaoFan](https://github.com/Harvey5678)

## Quick Start
Tarpaulin, a lightweight course management tool that’s an “alternative” to Canvas.  In particular, Tarpaulin allows users (instructors and students) to see information about the courses they’re teaching/taking.  It allows instructors to create assignments for their courses, and it allows students to submit solutions to those assignments.



## Quick Start
- docker cpomse up
- npm run dev

## Demo
- [OPenAPI](https://editor.swagger.io)
- ...
- ...

## Entities
- Users – These represent Tarpaulin application users.  Each User can have one of three roles: admin, instructor, and student.  Each of these roles represents a different set of permissions to perform certain API actions.  The permissions associated with these roles are defined further in the Tarpaulin OpenAPI specification.
- Courses – These represent courses being managed in Tarpaulin.  Each Course has basic information, such as subject code, number, title, instructor, etc.  Each Course also has associated data of other entity types, including a list of enrolled students (i.e. Tarpaulin Users with the student role) as well as a set of assignments.  More details about how to manage these pieces of data are included both below and in the Tarpaulin OpenAPI specification linked above.
- Assignments – These represent a single assignment for a Tarpaulin Course.  Each Assignment belongs to a specific Course and has basic information such as a title, due date, etc.  It also has a list of individual student submissions.
- Submissions – These represent a single student submission for an Assignment in Tarpaulin.  Each submission belongs both to its Assignment to the student who submitted it, and it is marked with a submission timestamp.  Each submission is also associated with a specific file, which will be uploaded to the Tarpaulin API and stored, so it can be downloaded later.  Finally, each submission may be assigned a grade, though grades cannot be assigned when the submission is first created but must be assigned later through an update operation.


  
