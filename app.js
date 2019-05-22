let http = require("http");
let fs = require("fs");
let mysql = require("mysql");
const {Client} = require("pg");

const DB_URL = process.env.DATABASE_URL;
let DATABASE_URL;
if (DB_URL) {
    DATABASE_URL = {connectionString: DB_URL};
} else {
    DATABASE_URL = {host: "localhost", user: "twitterdb", password: "twitterdb", database: "twitterdb"};
}

// console.log(DATABASE_URL);

const client = new Client(DATABASE_URL);
client.connect().then(() => client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")).then((result) => {
    // console.log("RESULTS:", result);
    // client.end();
}).catch((e) => {
    console.log("ERROR:", e);
    client.end();
});

console.log("Connecting database at:", DATABASE_URL);

let connected_users = [];

var port = process.env.PORT || 8888;


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
    })
};

app.get("/", get_index);

const post_login = (request, response) => {
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        console.log(body);
        let data = JSON.parse(body);
        client.query("SELECT * from users WHERE username = $1 AND password = $2;", [data.username, data.password], function (error, results) {
            console.log("ERROR:", error);
            console.log("RESULTS:", results.rows);
            // console.log("FIELDS:", fields);
            if (error === null) {
                if (results.rows.length === 1) {
                    console.log("ONE RESULT FOUND!");
                    response.writeHead(200);
                    response.end();
                } else {
                    console.log("NO RESULTS FOUND!");
                    response.writeHead(204);
                    response.write("NO RESULTS");
                    response.end();
                }
            } else {
                response.writeHead(202);
                response.write("DATABASE ERROR:", error);
                response.end();
            }
        });
    });
};

app.post("/login", post_login);


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

const post_feed = (request, response) => {
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        console.log(body);
        let data = JSON.parse(body);
        let username = data.username;
        console.log("received:", data);
        response.writeHead(200, {"Content-Type": "application/json"});
        client.query("SELECT * FROM posts WHERE username IN (SELECT followee FROM followers WHERE follower = $1);", [username], function (error, results, fields) {
            if (error === null) {
                // console.log(JSON.stringify(results));
                // response.write(JSON.stringify(;
                console.log("results: ", results.rows);
                response.writeHead(200);
                response.write(JSON.stringify({"posts": results.rows}));
                response.end();
            } else {
                console.log("ERROR: ", error);
                response.writeHead(204);
                response.end();
            }
        });
    });
};

app.post("/feed", post_feed);


const post_signup = (request, response) => {
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        console.log(body);
        let data = JSON.parse(body);
        client.query("INSERT INTO users VALUES($1, $2)", [data.username, data.password]).then((result) => {
            console.log("RESULTS:", result.rows);
            // client.end();
            response.writeHead(200);
            response.end();
        }).catch((e) => {
            console.log("ERROR:", e);
            // client.end();
        });

    });
};


app.post("/signup", post_signup);


const post_post = (request, response) => {
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        console.log(body);
        let data = JSON.parse(body);
        console.log(data);
        let timestamp = new Date().toISOString();
        client.query("INSERT INTO posts (username, content, timestamp) VALUES ($1, $2, $3)", [data.username, data.post.content, timestamp], function (error, results) {
            if (error == null) {
                response.writeHead(200);
                console.log("NEW POST ADDED!");
                response.end();
            } else {
                response.writeHead(204);
                console.log("ERROR:", error);
                response.end();
            }
        });
    });
};

app.post("/post", post_post);


function post_comment(request, response) {
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        console.log(body);
        let data = JSON.parse(body);
        console.log(data);
        client.query("INSERT INTO comments (username, content, parent, post) VALUES ($1, $2, $3, $4)", [data.username, data.content, data.parent, data.post], function (error, results) {
            if (error == null) {
                response.writeHead(200);
                console.log("NEW COMMENT ADDED!");
                response.end();
            } else {
                response.writeHead(204);
                console.log("ERROR:", error);
                response.end();
            }
        });
    });
}

app.post("/postcomment", post_comment);

const get_comments = (request, response) => {
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        console.log(body);
        let data = JSON.parse(body);
        console.log(data);
        client.query("select * from comments where post = $1;", [data.post], function (error, results) {
            if (error == null) {
                response.writeHead(200);
                response.write(JSON.stringify(results.rows));
                console.log("COMMENTS FOR POST;", data.post, ":", results.rows);
                response.end();
            } else {
                response.writeHead(204);
                console.log("ERROR:", error);
                response.end();
            }
        });
    });

};

app.get("/comments", get_comments);

const post_follow = (request, response) => {
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        console.log(body);
        if (body === undefined) {
            console.log("body is undefined!");
        }
        console.log("data received:", body);

        let data = JSON.parse(body);
        client.query("INSERT INTO followers (follower, followee) VALUES ($1, $2);", [data.username, data.follow], function (error, results) {
            if (error == null) {
                console.log("NO ERROR");
                if (results.length > 0) {
                    response.writeHead(200);
                    response.end();
                }
            } else {
                console.log("THERE WAS AN ERROR!");
                response.writeHead(400);
                response.write("ERROR!");
                response.end();
            }
        });
    });
};

app.post("/follow", post_follow);


const post_search = (request, response) => {
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        console.log(body);
        if (body === undefined) {
            console.log("body is undefined!");
        }
        console.log("data received:", body);

        let data = JSON.parse(body);
        client.query("SELECT * FROM users WHERE username = ?;", [data.search_term], function (error, results) {
            if (error == null) {
                console.log("NO ERROR");
                if (results.length > 0) {
                    console.log(results.rows);
                    response.writeHead(200);
                    response.write(JSON.stringify(results[0]));
                    response.end();
                }
            } else {
                console.log("THERE WAS AN ERROR!");
                response.writeHead(400);
                response.write("ERROR!");
                response.end();
            }
        });
    });
};

app.post("/search", post_search);

const put_userpic = (request, response) => {
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        let data = JSON.parse(body);
        client.query("UPDATE imgs SET img = $2 WHERE username = $1;", [data.username, data.img], function (error, results) {
                response.writeHead(200);
                response.end();
                console.log(data.img);
                console.log("ERROR:", error);
            }
        );
    });
};

app.put("/userpic", put_userpic);

const post_userpicture = (request, response) => {
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        console.log("received:", body);
        let data = JSON.parse(body);
        console.log("received:", data);
        client.query("SELECT img FROM imgs WHERE username = $1;", [data.username], function (error, result) {
            response.writeHead(200);
            response.write(JSON.stringify(result.rows));
            response.end();
        });
    });
};

app.post("/userpicture", post_userpicture);

const post_searchsuggestion = (request, response) => {
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        console.log(body);
        if (body === undefined) {
            console.log("body is undefined!");
        }
        console.log("data received:", body);

        let data = JSON.parse(body);
        console.log("data.text:", data.text);
        client.query("SELECT * FROM users WHERE username LIKE $1;", ['%' + data.text + '%'], function (error, results) {
            if (error == null) {
                console.log("NO ERROR");
                console.log("REUSLTS:", results);
                if (results.rows.length > 0) {
                    console.log("RESULTS:", results.rows);
                    response.writeHead(200);
                    response.write(JSON.stringify(results.rows));
                    response.end();
                } else {
                    response.writeHead(200);
                    response.write("{}");
                    response.end();
                }
            } else {
                console.log("ERRROR:", error);
                console.log("THERE WAS AN ERROR!");
                response.writeHead(400);
                response.write("ERROR!");
                response.end();
            }
        });
    });
};

app.post("/searchsuggestion", post_searchsuggestion);

app.default = function (request, response) {
    console.log("NOT FOUND:", request.method, request.url);
    response.writeHead(404);
    response.end();
};

http.createServer(function (request, response) {
    let handled = false;
    for (let req of app.requests) {
        if (request.url === req.url && request.method === req.method) {
            req.handler(request, response);
            handled = true;
            break;
        }
    }
    if (!handled) {
        app.default(request, response);
    }
}).listen(port);