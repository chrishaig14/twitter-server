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

console.log("Connecting database at:", DATABASE_URL);

let connected_users = [];

var port = process.env.PORT || 8888;

http.createServer(function (request, response) {

    const client = new Client(DATABASE_URL);
    client.connect().then(() => client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")).then((result) => {
        // console.log("RESULTS:", result);
        // client.end();
    }).catch((e) => {
        console.log("ERROR:", e);
        client.end();
    });
    console.log("request url: ", request.url);
    if (request.url === "/") {
        fs.readFile("client/index.html", function (err, data) {
            response.writeHead(200, {"Content-Type": "text/html"});
            response.write(data);
            response.end();
        })
    } else if (request.url === "/login") {
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
    } else if (request.url === "/styles.css") {
        fs.readFile("client/styles.css", function (err, data) {
            response.writeHead(200, {"Content-Type": "text/css"});
            response.write(data);
            response.end();
        })
    } else if (request.url === "/index.js") {
        fs.readFile("client/index.js", function (err, data) {
            response.writeHead(200, {"Content-Type": "application/javascript"});
            response.write(data);
            response.end();
        })
    } else if (request.url === "/feed") {
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


    } else if (request.url === "/signup") {
        if (request.method === "GET") {
            fs.readFile("client/signup.html", function (err, data) {
                response.writeHead(200, {"Content-Type": "text/html"});
                response.write(data);
                response.end();
            })
        } else if (request.method === "POST") {
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

        }
    } else if (request.url === "/post") {
        let body = [];
        request.on("data", chunk => {
            body.push(chunk);
        });
        request.on("end", () => {
            body = Buffer.concat(body).toString();
            console.log(body);
            let data = JSON.parse(body);
            console.log(data);
            client.query("INSERT INTO posts (username, content) VALUES ($1, $2)", [data.username, data.post.content], function (error, results) {
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
    } else if (request.url === "/postcomment") {
        if (request.method === "POST") {
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
    } else if (request.url === "/comments") {
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

    } else if (request.url === "/follow") {
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
    } else if (request.url === "/search") {
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
    } else if (request.url === "/searchsuggestion") {
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
    } else {
        console.log("NOT FOUND!");
        response.writeHead(404);
        response.end();
    }


}).listen(port);

let model = {
    users: [],
    posts: [],
    followers_table: [],
    create_user: function ({"username": username, "password": password, "info": info}) {
        this.users.push(userinfo);
    },
    user_follow: function (user, followee) {
        this.followers_table.push([user, followee]);
    }
};