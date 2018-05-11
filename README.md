API:

| URI              | Parameters                                   | Example | Explanation |
| ---------------- | -------------------------------------------- | ------- | ------- |
| `GET /users`     | N/A                                          | `/users`| [Test] Show all users and passwords.   |
| `POST /users`    | `username, password`                         | N/A     | Creates a new user with `password` in database if `username` doesn't exist or updates corresponding user `password` if the `username` exists.|
| `GET /messages`  | `userA, userB, numMsgPerPg, numPg`           |`/messages?userA=Alice&userB=Bob`, `/messages?userA=Alice&userB=Bob&numMsgPerPg=2&numPg=0`| Takes two users `userA` and `userB` (ordering doesn't matter) and loads all messages sent between them. Also takes two optional parameters to support pagination: `numMsgPerPg` being the number of messages to show per page and `numPg` being the 0-based page offset. |
| `POST /messages` | `sender, receiver, messageBody, messageType` | N/A     | Sends a message by taking a `sender`, `receiver`, `messageBody` and `messageType`. Default `messageType` is `Text`. If the `messageType` is `imageLink` or `videoLink`, additional metadata(currently hardcoded) will be stored. |

To test the app, first clone the repo to your local machine and navigate to app root directory.

Install the dependencies:
```npm install```

Run the app:
```node app.js```

Test and play it! The app listens to port 3000, navigate to: 
`localhost:3000/users`


