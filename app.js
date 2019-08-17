let http = require("http");
let fs = require("fs");
const {Client} = require("pg");
var url = require("url");
var cors = require("cors");
const express = require("express");
const app = express();
const port = process.env.PORT || 8888;
app.use(cors());

const queryString = require("query-string");

const DB_URL = process.env.DATABASE_URL;
let DATABASE_URL;
if (DB_URL) {
    DATABASE_URL = {connectionString: DB_URL};
} else {
    DATABASE_URL = {host: "localhost", user: "christian", password: "1234", database: "christiandb"};
}


const client = new Client(DATABASE_URL);
client.connect().then(() => client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")).then((result) => {
    // client.end();
}).catch((e) => {
    client.end();
});

console.log("Connecting database at:", DATABASE_URL);


function select_callback(result, response) {
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Expose-Headers", "Authorization");
    response.writeHead(200);
    response.write(result);
    response.end();
}

const get_users = (request, response) => {
    response.writeHead("200");
    response.write("USERS OK");
    response.end();
};

app.get("/users", get_users);

const login = (request, response) => {
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", async () => {
        body = Buffer.concat(body).toString();
        let data = JSON.parse(body);
        try {
            let results = await client.query("SELECT * from users WHERE username = $1 AND password = $2;", [data.username, data.password]);
            if (results.rows.length === 1) {
                response.setHeader("Content-Type", "application/json");
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.setHeader("Access-Control-Expose-Headers", "Authorization");
                response.setHeader("Authorization", data.username);
                response.writeHead(204);
                response.end();
            } else {
                response.writeHead(401, {"Access-Control-Allow-Origin": "*"});
                response.end();
            }
        } catch (error) {
            console.log("THERE WAS AN ERROR: ", error);
            response.writeHead(403);
            response.end();
        }
    });
};

app.post("/login", login);

const get_feed = async (request, response) => {

    let username = request.headers["authorization"];
    // All followed users posts
    try {
        let users_posts = await client.query("SELECT * FROM posts WHERE username IN (SELECT follows FROM followers WHERE username = $1);", [username]);
        // if (users_posts.rows.length === 0) throw "no posts for user";
        let my_posts = await client.query("SELECT * FROM posts WHERE username = $1;", [username]);
        let shares = await client.query("SELECT * FROM shares WHERE username IN (SELECT follows FROM followers WHERE username = $1);", [username]);
        console.log("USER POSTS:", users_posts.rows);
        console.log("MY POSTS:", my_posts.rows);
        console.log("SHARES:", shares.rows);
        users_posts = users_posts.rows;
        my_posts = my_posts.rows;
        shares = shares.rows;
        let posts = users_posts.concat(my_posts);

        for (let [index, post] of posts.entries()) {
            post.shares = await client.query("SELECT username FROM shares WHERE post = $1;", [post.id]);
            post.shares = post.shares.rows;
            for (let [index, user] of post.shares.entries()) {
                user = user.username;
                post.shares[index] = user;
            }
            posts[index] = post;
            console.log("POST SHARES: ", post.shares);
        }
        for (let [index, post] of posts.entries()) {
            post.retweet = await client.query("SELECT * FROM posts WHERE id = $1;", [post.retweet]);
            if (post.retweet.rows.length === 0) {
                post.retweet = null;
            } else {
                post.retweet = post.retweet.rows[0];
            }
            posts[index] = post;
        }

        console.log("POSTS: ", posts);
        response.writeHead(200, {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"});

        response.write(JSON.stringify({posts: posts, shares: shares}));
        response.end();
    } catch (error) {
        console.log("THERE WAS AN ERROR!: ", error);
        response.writeHead(401);
        response.end();
    }
};

app.get("/feed", get_feed);


const new_user = (request, response) => {
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();

        let data = JSON.parse(body);
        client.query("INSERT INTO users VALUES($1, $2) RETURNING *", [data.username, data.password]).then((result) => {


            client.query("INSERT INTO images VALUES($1, $2)", [data.username, ""]).then((result) => {

                response.setHeader("Content-Type", "application/json");
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.setHeader("Access-Control-Expose-Headers", "Authorization");
                response.writeHead(204);
                response.end();
            }).catch((e) => {

            });
        }).catch((e) => {

        });

    });
};


app.post("/users", new_user);

const share_post = (request, response) => {

    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {

        let username = request.headers["authorization"];

        body = Buffer.concat(body).toString();

        let data = JSON.parse(body);

        let timestamp = new Date().toISOString();
        client.query("INSERT INTO shares (username, post, timestamp) VALUES ($1, $2, $3) RETURNING *", [username, data.post_id, timestamp], function (error, results) {
            if (error == null) {
                response.setHeader("Content-Type", "application/json");
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.setHeader("Access-Control-Expose-Headers", "Authorization");
                response.writeHead(200);
                response.write(JSON.stringify(results.rows[0]));

                response.end();

            } else {
                response.writeHead(204);

                response.end();
            }
        });
    });
};


app.post("/shares", share_post);


const new_post = async (request, response) => {
    console.log("REQUEST headers: ", request.headers);
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", async () => {

            let username = request.headers["authorization"];

            body = Buffer.concat(body).toString();

            let data = JSON.parse(body);

        console.log("RECEIVE REQUEST: new post ", data);
        console.log("USER: ", username);

            let timestamp = new Date().toISOString();
            try {
                let new_post = await client.query("INSERT INTO posts (username, content, timestamp, retweet) VALUES ($1, $2, $3, $4) RETURNING *", [username, data.content, timestamp, data.retweet]);
                new_post = new_post.rows[0];
                new_post.shares = [];
                new_post.retweet = await client.query("SELECT * FROM posts WHERE id = $1;", [new_post.retweet]);
                if (new_post.retweet.rows.length === 0) {
                    new_post.retweet = null;
                } else {
                    new_post.retweet = new_post.retweet.rows[0];
                }
                response.setHeader("Content-Type", "application/json");
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.setHeader("Access-Control-Expose-Headers", "Authorization");
                response.writeHead(200);
                response.write(JSON.stringify(new_post));
                response.end();
            } catch (error) {
                console.log("THERE WAS AN ERROR: ", error);
                response.writeHead(401);
                response.end();
            }
        }
    );
};


app.post("/posts", new_post);

function new_comment(request, response) {
    let username = request.headers["authorization"];
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", async () => {
        body = Buffer.concat(body).toString();

        let data = JSON.parse(body);

        let post_id = request.params.postId;
        try {
            let new_comment = await client.query("INSERT INTO comments (username, content, parent, post) VALUES ($1, $2, $3, $4) RETURNING *", [username, data.content, data.parent, post_id]);
            new_comment = new_comment.rows[0];
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Expose-Headers", "Authorization");
            response.writeHead(200);
            response.write(JSON.stringify(new_comment));
            response.end();
        } catch (error) {
            console.log("THERE WAS AN ERROR: ", error);
            response.writeHead(401);
            response.end();
        }
    });
}

app.post("/posts/:postId/comments", new_comment);

const get_comments = async (request, response) => {
    let post_id = request.params.postId;
    try {
        let comments = await client.query("SELECT * FROM comments WHERE post = $1;", [post_id]);
        comments = comments.rows;
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Expose-Headers", "Authorization");
        response.writeHead(200);
        response.write(JSON.stringify(comments));
        response.end();
    } catch (error) {
        console.log("THERE WAS AN ERROR: ", error);
        response.writeHead(401);
        response.end();
    }
};

app.get("/posts/:postId/comments", get_comments);


const get_post = (request, response) => {
    let post_id = request.params.postId;
    client.query("SELECT * FROM posts WHERE id = $1;", [post_id], (error, result) => {
        if (error === null) {
            select_callback(JSON.stringify(result.rows[0]), response);
        } else {
            response.writeHead(204);
            response.end();
        }
    });
};

app.get("/posts/:postId", get_post);

const put_userpic = (request, response) => {
    let token = request.headers["authorization"];
    let username = token;

    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        img = body;

        client.query("UPDATE images SET img = $2 WHERE username = $1;", [username, img], function (error, results) {

                response.setHeader("Access-Control-Allow-Origin", "*");
                response.setHeader("Access-Control-Expose-Headers", "Authorization");
                response.writeHead(200);
                response.end();

            }
        );
    });
};

app.put("/users/me/img", put_userpic);

const get_search = async (request, response) => {
    let url_parsed = url.parse(request.url);
    let qstring = queryString.parse(url_parsed.search);

    try {
        let results = await client.query("SELECT username FROM users WHERE username LIKE $1;", ["%" + qstring.term + "%"]);
        results = results.rows;
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Expose-Headers", "Authorization");
        response.writeHead(200);
        response.write(JSON.stringify(results));
        response.end();
    } catch (error) {
        console.log("THERE WAS AN ERROR: ", error);
        response.writeHead(401);
        response.end();
    }
};

app.get("/search", get_search);

const get_user_image = async (request, response) => {

    let user_id = request.params.username;

    try {
        let img = await client.query("SELECT img FROM images WHERE username = $1;", [user_id]);
        img = img.rows[0];
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Expose-Headers", "Authorization");
        response.writeHead(200);
        response.write(img.img);
        response.end();
    } catch (error) {
        console.log("THERE WAS AN ERROR: ", error);
        response.writeHead(401);
        response.end();
    }
};

app.get("/users/:username/img", get_user_image);
const get_user_info = (request, response) => {
    let user_id = request.params.username;
    if (user_id === "me") {
        user_id = request.headers["authorization"];
    }

    client.query("SELECT img FROM images WHERE username = $1", [user_id], function (error, result) {
            if (error === null) {
                response.setHeader("Content-Type", "application/json");
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.setHeader("Access-Control-Expose-Headers", "Authorization");

                response.writeHead(200);
                let pic = result.rows[0]["img"];
                response.write(JSON.stringify({username: user_id, pic: pic, info: ""}));

                response.end();
            } else {
                response.writeHead(401);
                response.end();
            }
        }
    );

};

app.get("/users/:username", get_user_info);

const get_user_posts = async (request, response) => {

    let username = request.params.username;
    // All followed users posts
    try {
        let posts = await client.query("SELECT * FROM posts WHERE username = $1;", [username]);
        // let shares = await client.query("SELECT * FROM shares WHERE username IN (SELECT followee FROM followers WHERE follower = $1);", [username]);
        // console.log("USER POSTS:", users_posts.rows);
        // console.log("MY POSTS:", my_posts.rows);
        // console.log("SHARES:", shares.rows);
        console.log("POSTS:", posts.rows);
        posts = posts.rows;
        // shares = shares.rows;
        for (let [index, post] of posts.entries()) {
            post.shares = await client.query("SELECT username FROM shares WHERE post = $1;", [post.id]);
            post.shares = post.shares.rows;
            for (let [index, user] of post.shares.entries()) {
                user = user.username;
                post.shares[index] = user;
            }
            posts[index] = post;
            console.log("POST SHARES: ", post.shares);
        }
        for (let [index, post] of posts.entries()) {
            post.retweet = await client.query("SELECT * FROM posts WHERE id = $1;", [post.retweet]);
            if (post.retweet.rows.length === 0) {
                post.retweet = null;
            } else {
                post.retweet = post.retweet.rows[0];
            }
            posts[index] = post;
        }

        console.log("POSTS: ", posts);
        response.writeHead(200, {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"});

        response.write(JSON.stringify({posts: posts}));
        response.end();
    } catch (error) {
        console.log("THERE WAS AN ERROR!: ", error);
        response.writeHead(401);
        response.end();
    }
};

app.get("/users/:username/posts", get_user_posts);

const get_followee = (request, response) => {
    let user_id = request.params.username;
    if (user_id === "me") {
        user_id = request.headers["authorization"];
    }
    let followee_id = request.params.follow;
    client.query("SELECT * FROM followers WHERE username = $1 AND follows = $2;", [user_id, followee_id], (error, result) => {
        if (result.rows.length === 0) {
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Expose-Headers", "Authorization");
            response.writeHead(204);
            response.end();
        } else {
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Expose-Headers", "Authorization");
            response.writeHead(200);
            response.end();
        }
    });
};

app.get("/users/:username/followees/:follow", get_followee);

const get_followees = (request, response) => {
    let user_id = request.params.username;
    if (user_id === "me") {
        user_id = request.headers["authorization"];
    }
    client.query("SELECT follows FROM followers WHERE username = $1", [user_id], (error, result) => {
        if (error === null) {
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Expose-Headers", "Authorization");
            response.writeHead(200);
            console.log("SENDING: ", result.rows);
            response.write(JSON.stringify(result.rows.map(x => x.follows)));

            response.end();
        } else {
            response.writeHead(401);
            response.end();
        }
    });
};

app.get("/users/:username/followees", get_followees);

const delete_followee = (request, response) => {
    let user_id = request.params.username;
    if (user_id === "me") {
        user_id = request.headers["authorization"];
    }
    let followee_id = request.params.follow;
    client.query("DELETE FROM followers WHERE username = $1 AND follows = $2;", [user_id, followee_id], (error, result) => {

        response.setHeader("Content-Type", "application/json");
        response.setHeader("Access-Control-Allow-Methods", "DELETE");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Expose-Headers", "Authorization");
        response.writeHead(204);
        response.end();
    });
};

app.delete("/users/:username/followees/:follow", delete_followee);

const put_followee = (request, response) => {
    let user_id = request.params.username;
    if (user_id === "me") {
        user_id = request.headers["authorization"];
    }
    let followee_id = request.params.follow;
    client.query("DELETE FROM followers WHERE username = $1 AND follows = $2;", [user_id, followee_id], (error, result) => {
        client.query("INSERT INTO followers (username,follows) VALUES ($1,$2);", [user_id, followee_id], (error, result) => {
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Access-Control-Allow-Methods", "DELETE");
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Expose-Headers", "Authorization");
            response.writeHead(204);
            response.end();
        });
    });

};

app.put("/users/:username/followees/:follow", put_followee);

app.listen(port);
