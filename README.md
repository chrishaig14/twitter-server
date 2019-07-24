Repo for the front end: [twitter-app](https://github.com/chrishaig14/twitter-app)

# API

##Login

### REQUEST

URL: "/login"

METHOD: POST

BODY:
```json
{
  "username": "user123",
  "password": "password123"
}
```

### RESPONSE

Code: 200

HEADERS:

Authorization: token

## Get feed

### REQUEST

URL: "/feed"

METHOD: GET

### RESPONSE

Code: 200

```json
[
  {
    "post": {
      "id": "1",
      "username": "user234",
      "content": "Hello world",
      "timestamp": "xxxxx",
      "retweet": "3"
    }
  },
  {
    "post": {
      "id": "4",
      "username": "user789",
      "content": "Bye bye",
      "timestamp": "yyyyy",
      "retweet": "null"
    }
  }
]
```

## New post

### REQUEST

URL: "/posts"

METHOD: POST

BODY: 

```json
{
  "content": "post content",
  "retweet": "23"
}
```

### RESPONSE

Code: 200

BODY:

```json
{
  "id": "123",
  "content": "post content",
  "username": "user123",
  "retweet": {
    "id": "23",
    "content": "hello world",
    "username": "user654",
    "timestamp": "yyyyy"
  },
  "timestamp": "xxxxx"
}
```

## Share post

### REQUEST

URL: "posts/postId/shares"

METHOD: POST

BODY: -

### RESPONSE

## New comment

### REQUEST

URL: "posts/postId/comments"

METHOD: POST

BODY:

```json
{
  "content": "this is a comment"
}
```

### RESPONSE

CODE: 200

BODY:

```json
{
   "postId":"123",
   "content":"this is a comment"
}
```

