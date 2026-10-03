# Library Books API

Base URL: `https://api.example.com`

The API represents books at `/books`. A book has an `id`, `title`, `authorId`,
`isbn`, and `publishedYear`. Requests with a body use JSON.

| Method | Path | Description | Example request body | Success status |
| --- | --- | --- | --- | --- |
| GET | `/books` | List all books. | — | `200 OK` |
| GET | `/books/{bookId}` | Get one book by its ID. | — | `200 OK` |
| POST | `/books` | Create a book. | `{"title":"The Hobbit","authorId":42,"isbn":"9780547928227","publishedYear":1937}` | `201 Created` |
| PUT | `/books/{bookId}` | Replace a book's details. | `{"title":"The Hobbit","authorId":42,"isbn":"9780547928227","publishedYear":1937}` | `200 OK` |
| DELETE | `/books/{bookId}` | Delete a book by its ID. | — | `204 No Content` |
| GET | `/books?authorId={authorId}` | List books by an author, filtered by the `authorId` query parameter. | — | `200 OK` |

## Error responses

- `400 Bad Request` — The request is invalid, such as creating a book without
  the required `title` or with a malformed `publishedYear`.
- `404 Not Found` — The requested book does not exist, such as requesting
  `GET /books/9999` when there is no book with ID `9999`.
