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
    // console.log("RESULTS:", result);
    // client.end();
}).catch((e) => {
    console.log("ERROR:", e);
    client.end();
});

console.log("Connecting database at:", DATABASE_URL);

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
        console.log("BODY:", body);
        try {
            let request_body = JSON.parse(body);
            on_end(request, response, request_body);
        } catch (e) {
            console.log("THERE WAS A FOCKING ERROR YOU TWAT!");
            response.writeHead(400, {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"});
            response.end();
        }
    });
}

function login_handler(request, response, data) {
    client.query("SELECT * from users WHERE username = $1 AND password = $2;", [data.username, data.password], function (error, results) {
        console.log("ERROR:", error);
        console.log("RESULTS:", results.rows);
        // console.log("FIELDS:", fields);
        if (error === null) {
            if (results.rows.length === 1) {
                console.log("ONE RESULT FOUND!");
                response.setHeader("Content-Type", "application/json");
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.setHeader("Access-Control-Expose-Headers", "Authorization");
                response.setHeader("Authorization", data.username);
                response.writeHead(204);
                // response.write(JSON.stringify({"str":data.username}));
                response.end();
            } else {
                console.log("NO RESULTS FOUND!");
                // response.writeHead(204);
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
    get_request_body(request, response, login_handler);
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

const get_feed = (request, response) => {

    console.log("headers: ", request.headers);
    let username = request.headers["authorization"];
    console.log("USERNAME:::", username);
    // console.log("received:", data);
    // response.writeHead(200, {'Access-Control-Allow-Origin':'*', "Content-Type": "application/json"});
    client.query("SELECT * FROM posts WHERE username IN (SELECT followee FROM followers WHERE follower = $1);", [username], function (error, results, fields) {
        if (error === null) {
            console.log("results: ", results.rows);

            client.query("SELECT * FROM posts WHERE username = $1;", [username], function (error, results2, fields) {
                response.writeHead(200, {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"});
                let posts = results2.rows.concat(results.rows);
                console.log("POSTS: ", result.rows);
                console.log("POSTS: ", results2.rows);
                console.log("POSTS: ", posts);
                client.query("SELECT * FROM shares WHERE username IN (SELECT followee FROM followers WHERE follower = $1);", [username], function (error, results3, fields) {
                        response.write(JSON.stringify({posts: posts, shares: results3.rows}));
                        response.end();
                    }
                );
            });
        } else {
            console.log("ERROR: ", error);
            // response.writeHead(204);
            response.writeHead(204, {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"});
            response.end();
        }
    });
};

app.get("/feed", get_feed);


const new_user = (request, response) => {
    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        console.log(body);
        let data = JSON.parse(body);
        client.query("INSERT INTO users VALUES($1, $2) RETURNING *", [data.username, data.password]).then((result) => {
            console.log("result: ", result);
            console.log("NO ERROR! RESULTS:", result.rows);

            // client.end();
            client.query("INSERT INTO imgs VALUES($1, $2)", [data.username, ""]).then((result) => {
                console.log("RESULTS:", result.rows);
                // client.end();
                console.log("ONE RESULT FOUND!");
                response.setHeader("Content-Type", "application/json");
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.setHeader("Access-Control-Expose-Headers", "Authorization");
                response.writeHead(204);
                response.end();
            }).catch((e) => {
                console.log("ERROR INSERTING IMAGE:", e);
                // client.end();
            });
        }).catch((e) => {
            console.log("ERROR CREATING USER:", e);
            // client.end();
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
        console.log("HEADERS RECEIVED ARE: ", request.headers);
        let username = request.headers["authorization"];
        console.log("posting for user: ", username);
        body = Buffer.concat(body).toString();
        console.log(body);
        let data = JSON.parse(body);
        console.log(data);
        let timestamp = new Date().toISOString();
        client.query("INSERT INTO shares (username, post_id, timestamp) VALUES ($1, $2, $3) RETURNING *", [username, data.post_id, timestamp], function (error, results) {
            if (error == null) {
                response.setHeader("Content-Type", "application/json");
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.setHeader("Access-Control-Expose-Headers", "Authorization");
                response.writeHead(200);
                response.write(JSON.stringify(results.rows[0]));
                // console.log("SENDING:" , JSON.stringify(results.rows[0]));
                // console.log("NEW POST ADDED!");
                response.end();

            } else {
                response.writeHead(204);
                console.log("ERROR:", error);
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
    request.on("end", () => {
        console.log("HEADERS RECEIVED ARE: ", request.headers);
        let username = request.headers["authorization"];
        console.log("posting for user: ", username);
        body = Buffer.concat(body).toString();
        console.log(body);
        let data = JSON.parse(body);
        console.log(data);
        let timestamp = new Date().toISOString();
        client.query("INSERT INTO posts (username, content, timestamp, retweet) VALUES ($1, $2, $3, $4) RETURNING *", [username, data.content, timestamp, data.retweet], function (error, results) {
            if (error == null) {

                response.setHeader("Content-Type", "application/json");
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.setHeader("Access-Control-Expose-Headers", "Authorization");
                response.writeHead(200);
                // console.log("RESULTS: ", results);
                // console.log("ADDED NEW POST: ", results.rows);
                response.write(JSON.stringify(results.rows[0]));
                console.log("SENDING:", JSON.stringify(results.rows[0]));
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


app.post("/posts", new_post);

function new_comment(request, response) {
    let token = request.headers["authorization"];
    let username = token;

    let body = [];
    request.on("data", chunk => {
        body.push(chunk);
    });
    request.on("end", () => {
        body = Buffer.concat(body).toString();
        console.log(body);
        let data = JSON.parse(body);
        console.log(data);
        let post_id = request.url.split("/")[2];
        client.query("INSERT INTO comments (username, content, parent, post) VALUES ($1, $2, $3, $4) RETURNING *", [username, data.content, data.parent, post_id], function (error, results) {
            if (error == null) {
                response.setHeader("Content-Type", "application/json");
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.setHeader("Access-Control-Expose-Headers", "Authorization");
                response.writeHead(200);
                response.write(JSON.stringify(results.rows[0]));
                console.log("NEW COMMENT ADDED!");
                response.end();
            } else {
                response.writeHead(401);
                console.log("ERROR:", error);
                response.end();
            }
        });
    });
}

app.post("/posts/{}/comments", new_comment);

const get_comments = (request, response) => {
    let post_id = request.url.split("/")[2];
    client.query("SELECT * FROM comments WHERE post = $1;", [post_id], function (error, results) {
        if (error == null) {
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Expose-Headers", "Authorization");
            response.writeHead(200);
            response.write(JSON.stringify(results.rows));
            console.log("COMMENTS FOR POST;", post_id, ":", results.rows);
            response.end();
        } else {
            response.writeHead(204);
            console.log("ERROR:", error);
            response.end();
        }
    });
};

app.get("/posts/{}/comments", get_comments);

const get_post = (request, response) => {
    let post_id = request.url.split("/")[2];
    client.query("SELECT * FROM posts WHERE id = $1;", [post_id], function (error, results) {
        if (error == null) {
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Expose-Headers", "Authorization");
            response.writeHead(200);
            response.write(JSON.stringify(results.rows[0]));
            console.log("RETURNING POST DATA", post_id, ":", results.rows);
            response.end();
        } else {
            response.writeHead(204);
            console.log("ERROR:", error);
            response.end();
        }
    });
};

app.get("/posts/{}", get_post);

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
        client.query("SELECT * FROM users WHERE username = $1;", [data.search_term], function (error, results) {
            if (error == null) {
                console.log("NO ERROR");
                console.log("RESULTS:::: ", results);
                console.log("SEARCHTERM: ", data.search_term);
                if (results.rows.length > 0) {
                    console.log("RESULTS:", results.rows);
                    response.setHeader("Content-Type", "application/json");
                    response.setHeader("Access-Control-Allow-Origin", "*");
                    response.setHeader("Access-Control-Expose-Headers", "Authorization");
                    response.writeHead(200);
                    response.write(JSON.stringify(results.rows));
                    response.end();
                }
            } else {

                console.log("SERACH: THERE WAS AN ERROR!: ", error);
                console.log("RESULTS: ", results);
                response.writeHead(400);
                response.write("ERROR!");
                response.end();
            }
        });
    });
};

app.post("/search", post_search);

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
        console.log("UPDATING IMAGE OF USER:", username, " img=", img.slice(20, 40));
        client.query("UPDATE imgs SET img = $2 WHERE username = $1;", [username, img], function (error, results) {
            console.log("ERROR: ", error);
            console.log("UPDATE IMAGE RESULTS: ", results);
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Expose-Headers", "Authorization");
                response.writeHead(200);
                response.end();
            // console.log(data.img);
                console.log("ERROR:", error);
            }
        );
    });
};

app.put("/users/me/img", put_userpic);

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

const get_search = (request, response) => {
    let url_parsed = url.parse(request.url);
    let qstring = queryString.parse(url_parsed.search);
    console.log("######## SEARCH URL : ", url_parsed.search);
    console.log("######## QUERY : ", qstring);

    client.query("SELECT username FROM users WHERE username LIKE $1;", ["%" + qstring.term + "%"], function (error, results) {
        if (error == null) {
            console.log("NO ERROR");
            console.log("REUSLTS:", results);
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Expose-Headers", "Authorization");
            if (results.rows.length > 0) {
                console.log("RESULTS:", results.rows);

                response.writeHead(200);
                response.write(JSON.stringify(results.rows));
                response.end();
            } else {
                response.writeHead(200);
                response.write("[]");
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
};

app.get("/search", get_search);

app.default = function (request, response) {
    console.log("NOT FOUND:", request.method, request.url);
    if (request.method === "OPTIONS") {
        response.setHeader("Access-Control-Allow-Methods", "DELETE, PUT");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        response.writeHead(204);
        response.end();
        console.log("SENT OPTIONS RESPONSE OK!");
        1;
        return;
    }
    response.writeHead(404);
    response.end();
};

const get_user_image = (request, response) => {
    console.log("GETTING USER IMAGE!!!!");
    let user_id = request.url.split("/")[2];

    client.query("SELECT img FROM imgs WHERE username = $1;", [user_id], (error, result) => {
        console.log("user_id:", user_id);
        // console.log(result.rows[0].img.substr(0, 10));
        // response.setHeader("Content-Type","application/json");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Expose-Headers", "Authorization");

        if (result.rows.length === 0) {
            response.writeHead(404);
        } else if (!result.rows[0].hasOwnProperty("img")) {
            response.writeHead(200);
            response.write("");
        } else {
            // console.log("returning ", result.rows[0])
            console.log("RETURNING USER IMAGE: ", user_id);
            response.writeHead(200);
            response.write(result.rows[0].img);
        }
        response.end();
    });
};

app.get("/users/{}/img", get_user_image);

function match_url(pattern, url) {
    let s_pat = pattern.split("/");
    let s_url = url.split("/");
    let q_string = s_url[s_url.length - 1];
    q_string = q_string.split("?");
    s_url[s_url.length - 1] = q_string[0];
    // console.log("Q_STRING: ", q_string);
    console.log("S_URL: ", s_url);
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
                console.log("RESULT: ", result.rows[0].hasOwnProperty("img"));
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
        console.log("HEADERS RECEIVED ARE: ", request.headers);
        user_id = request.headers["authorization"];
        // response.write(JSON.stringify({username: token}));
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
        console.log("HEADERS RECEIVED ARE: ", request.headers);
        user_id = request.headers["authorization"];
        // response.write(JSON.stringify({username: token}));
    }
    // let followee_id = request.url.split("/")[4];
    client.query("SELECT followee FROM followers WHERE follower = $1", [user_id], (error, result) => {
        console.log("SENDING RESULTS: ", result.rows);
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Expose-Headers", "Authorization");
        response.writeHead(200);
        response.write(JSON.stringify(result.rows));
        response.end();
    });
};

app.get("/users/{}/followees", get_followees);

const delete_followee = (request, response) => {
    let user_id = request.url.split("/")[2];
    if (user_id === "me") {
        console.log("HEADERS RECEIVED ARE: ", request.headers);
        user_id = request.headers["authorization"];
        // response.write(JSON.stringify({username: token}));
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
        console.log("HEADERS RECEIVED ARE: ", request.headers);
        user_id = request.headers["authorization"];
        // response.write(JSON.stringify({username: token}));
    }
    let followee_id = request.url.split("/")[4];
    client.query("DELETE FROM followers WHERE follower = $1 AND followee = $2;", [user_id, followee_id], (error, result) => {
        client.query("INSERT INTO followers (follower,followee) VALUES ($1,$2);", [user_id, followee_id], (error, result) => {
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Access-Control-Allow-Methods", "DELETE");
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Expose-Headers", "Authorization");
            response.writeHead(204);
            // response.write("{}");
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