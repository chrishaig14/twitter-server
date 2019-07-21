let http = require("http");
let fs = require("fs");
const {Client} = require("pg");
var url = require("url");
const queryString = require("query-string");

const DB_URL = process.env.DATABASE_URL;
let DATABASE_URL;
if (DB_URL) {
    DATABASE_URL = {connectionString: DB_URL};
} else {
    DATABASE_URL = {host: "localhost", user: "twitterdb", password: "twitterdb", database: "twitterdb"};
}


const client = new Client(DATABASE_URL);
client.connect().then(() => client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")).then((result) => {
    // client.end();
}).catch((e) => {
    client.end();
});

console.log("Connecting database at:", DATABASE_URL);

var port = process.env.PORT || 8888;

function select_callback(result, response) {
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Expose-Headers", "Authorization");
    response.writeHead(200);
    response.write(result);
    response.end();
}


let app = {
    "requests": [],
    "add_request": function (url, method, handler) {
        this.requests.push({"url": url, "method": method, "handler": handler});
    },
    "get": function (url, handler) {
        this.add_request(url, "GET", handler);
    },
    "post": function (url, handler) {
        this.add_request(url, "POST", handler);
    },
    "put": function (url, handler) {
        this.add_request(url, "PUT", handler);
    },
    "delete": function (url, handler) {
        this.add_request(url, "DELETE", handler);
    }
};

const get_users = (request, response) => {
    response.writeHead("200");
    response.write("USERS OK");
    response.end();
};

app.get("/users", get_users);

const get_index = (request, response) => {
    fs.readFile("client/index.html", function (err, data) {
        response.writeHead(200, {"Content-Type": "text/html"});
        response.write(data);
        response.end();
    });
};

app.get("/", get_index);

function get_request_body(request, response, on_end) {
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        try {
            let request_body = JSON.parse(body);
            on_end(request, response, request_body);
        } catch (e) {
            response.writeHead(400, {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"});
            response.end();
        }
    });
}

function login_handler(request, response, data) {
    client.query("SELECT * from users WHERE username = $1 AND password = $2;", [data.username, data.password], function (error, results) {
        if (error === null) {
            if (results.rows.length === 1) {
                response.setHeader("Content-Type", "application/json");
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.setHeader("Access-Control-Expose-Headers", "Authorization");
                response.setHeader("Authorization", data.username);
                response.writeHead(204);
                response.end();
            } else {
                response.writeHead(401, {"Access-Control-Allow-Origin": "*"});
                response.write("NOTOK NOTOK NOTOK NOTOK NOTOK");
                response.end();
            }
        } else {
            response.writeHead(202);
            response.write("DATABASE ERROR:", error);
            response.end();
        }
    });
}

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


const get_styles_css = (request, response) => {
    fs.readFile("client/styles.css", function (err, data) {
        response.writeHead(200, {"Content-Type": "text/css"});
        response.write(data);
        response.end();
    });
};

const get_index_js = (request, response) => {
    fs.readFile("client/index.js", function (err, data) {
        response.writeHead(200, {"Content-Type": "application/javascript"});
        response.write(data);
        response.end();
    });
};

app.get("/styles.css", get_styles_css);

app.get("/index.js", get_index_js);

const get_feed = async (request, response) => {

    let username = request.headers["authorization"];
    // All followed users posts
    try {
        let users_posts = await client.query("SELECT * FROM posts WHERE username IN (SELECT followee FROM followers WHERE follower = $1);", [username]);
        let my_posts = await client.query("SELECT * FROM posts WHERE username = $1;", [username]);
        let shares = await client.query("SELECT * FROM shares WHERE username IN (SELECT followee FROM followers WHERE follower = $1);", [username]);
        console.log("USER POSTS:", users_posts.rows);
        console.log("MY POSTS:", my_posts.rows);
        console.log("SHARES:", shares.rows);
        users_posts = users_posts.rows;
        my_posts = my_posts.rows;
        shares = shares.rows;
        let posts = users_posts.concat(my_posts);

        for (let [index, post] of posts.entries()) {
            post.shares = await client.query("SELECT username FROM shares WHERE post_id = $1;", [post.id]);
            post.shares = post.shares.rows;
            for (let [index, user] of post.shares.entries()) {
                user = user.username;
                post.shares[index] = user;
            }
            posts[index] = post;
            console.log("POST SHARES: ", post.shares);
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


            client.query("INSERT INTO imgs VALUES($1, $2)", [data.username, ""]).then((result) => {

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
        client.query("INSERT INTO shares (username, post_id, timestamp) VALUES ($1, $2, $3) RETURNING *", [username, data.post_id, timestamp], function (error, results) {
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


const new_post = (request, response) => {

    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", async () => {

            let username = request.headers["authorization"];

            body = Buffer.concat(body).toString();

            let data = JSON.parse(body);

            let timestamp = new Date().toISOString();
            try {
                let new_post = await client.query("INSERT INTO posts (username, content, timestamp, retweet) VALUES ($1, $2, $3, $4) RETURNING *", [username, data.content, timestamp, data.retweet]);
                new_post = new_post.rows[0];
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
    let token = request.headers["authorization"];
    let username = token;

    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", async () => {
        body = Buffer.concat(body).toString();

        let data = JSON.parse(body);

        let post_id = request.url.split("/")[2];
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

app.post("/posts/{}/comments", new_comment);

const get_comments = async (request, response) => {
    let post_id = request.url.split("/")[2];
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

app.get("/posts/{}/comments", get_comments);


const get_post = (request, response) => {
    let post_id = request.url.split("/")[2];
    client.query("SELECT * FROM posts WHERE id = $1;", [post_id], (error, result) => {
        if (error === null) {
            select_callback(JSON.stringify(result.rows[0]), response);
        } else {
            response.writeHead(204);
            response.end();
        }
    });
};

app.get("/posts/{}", get_post);

const put_userpic = (request, response) => {
    let token = request.headers["authorization"];
    let username = token;

    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        // let data = JSON.parse(body);
        img = body;

        client.query("UPDATE imgs SET img = $2 WHERE username = $1;", [username, img], function (error, results) {

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

app.default = function (request, response) {

    if (request.method === "OPTIONS") {
        response.setHeader("Access-Control-Allow-Methods", "DELETE, PUT");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        response.writeHead(204);
        response.end();

        return;
    }
    response.writeHead(404);
    response.end();
};

const get_user_image = async (request, response) => {

    let user_id = request.url.split("/")[2];

    try {
        let img = await client.query("SELECT img FROM imgs WHERE username = $1;", [user_id]);
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

app.get("/users/{}/img", get_user_image);

function match_url(pattern, url) {
    let s_pat = pattern.split("/");
    let s_url = url.split("/");
    let q_string = s_url[s_url.length - 1];
    q_string = q_string.split("?");
    s_url[s_url.length - 1] = q_string[0];
    if (s_pat.length !== s_url.length) {
        return false;
    }
    for (let i = 0; i < s_pat.length; i++) {
        if (s_pat[i] === s_url[i] || s_pat[i] === "{}") {
            continue;
        } else {
            return false;
        }
    }
    return true;
}

const get_user_info = (request, response) => {
    let user_id = request.url.split("/")[2];
    if (user_id === "me") {
        user_id = request.headers["authorization"];
    }

    client.query("SELECT img FROM imgs WHERE username = $1", [user_id], function (error, result) {
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

app.get("/users/{}", get_user_info);

const get_user_posts = (request, response) => {
    let user_id = request.url.split("/")[2];
    client.query("SELECT * FROM posts WHERE username = $1;", [user_id], (error, result) => {
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Expose-Headers", "Authorization");
        response.writeHead(200);
        response.write(JSON.stringify(result.rows));
        response.end();
    });
};

app.get("/users/{}/posts", get_user_posts);

const get_followee = (request, response) => {
    let user_id = request.url.split("/")[2];
    if (user_id === "me") {
        user_id = request.headers["authorization"];
    }
    let followee_id = request.url.split("/")[4];
    client.query("SELECT * FROM followers WHERE follower = $1 AND followee = $2;", [user_id, followee_id], (error, result) => {
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

app.get("/users/{}/followees/{}", get_followee);

const get_followees = (request, response) => {
    let user_id = request.url.split("/")[2];
    if (user_id === "me") {
        user_id = request.headers["authorization"];
    }
    client.query("SELECT followee FROM followers WHERE follower = $1", [user_id], (error, result) => {
        if (error === null) {
            select_callback(JSON.stringify(result.rows), response);
        } else {
            response.writeHead(401);
            response.end();
        }
    });
};

app.get("/users/{}/followees", get_followees);

let make = function (str, pattern) {
    let str_split = str.split("/");
    let pat_split = pattern.split("/");
    if (str_split.length !== pat_split.length) {
        return false;
    }
    let obj = {};
    for (let i = 0; i < pat_split.length; i++) {
        let pat = pat_split[i];
        let st = str_split[i];
        if (pat[0] === ":") {
            obj[pat.slice(1)] = st;
        } else {
            if (pat !== st) {
                return false;
            }
        }
    }
    return obj;
};

const delete_followee = (request, response) => {
    let user_id = request.url.split("/")[2];
    if (user_id === "me") {
        user_id = request.headers["authorization"];
    }
    let followee_id = request.url.split("/")[4];
    client.query("DELETE FROM followers WHERE follower = $1 AND followee = $2;", [user_id, followee_id], (error, result) => {

        response.setHeader("Content-Type", "application/json");
        response.setHeader("Access-Control-Allow-Methods", "DELETE");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Expose-Headers", "Authorization");
        response.writeHead(204);
        response.end();
    });
};

app.delete("/users/{}/followees/{}", delete_followee);

const put_followee = (request, response) => {
    let user_id = request.url.split("/")[2];
    if (user_id === "me") {
        user_id = request.headers["authorization"];
    }
    let followee_id = request.url.split("/")[4];
    client.query("DELETE FROM followers WHERE follower = $1 AND followee = $2;", [user_id, followee_id], (error, result) => {
        client.query("INSERT INTO followers (follower,followee) VALUES ($1,$2);", [user_id, followee_id], (error, result) => {
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Access-Control-Allow-Methods", "DELETE");
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Expose-Headers", "Authorization");
            response.writeHead(204);
            response.end();
        });
    });

};

app.put("/users/{}/followees/{}", put_followee);

http.createServer(function (request, response) {
    let handled = false;
    for (let req of app.requests) {
        // if (match_url(req.url, request.url))
        if (match_url(req.url, request.url) && request.method === req.method) {
            req.handler(request, response);
            handled = true;
            break;
        }
    }
    if (!handled) {
        console.log("ERROR: no match for: ", request.url);

        app.default(request, response);
    }
}).listen(port);