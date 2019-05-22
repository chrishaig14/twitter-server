# Create new user account

POST /users

request body:

{"user":
    {"username":"user1",
    "password":"user1pass",
    "info":"Information about user1",
    "img":"user1 profile pic in base64"
    }
}

response:

200 ok -> user created successfully
400 -> error:
    