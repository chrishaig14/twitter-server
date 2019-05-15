let http = require("http");
let fs = require("fs");
let mysql = require("mysql");
const {Client} = require("pg");
let con = mysql.createConnection({host: "localhost", user: "root", password: "root"});

const {DATABASE_URL} = process.env;

let connected_users = [];

var port = process.env.PORT || 8888;
con.connect(function (err) {
    if (err) {
        console.log("COULD NOT CONNECT TO DATABASE");
        return;
        throw err;
    }
    console.log("Connected");
});
con.query("USE twitter;", function (error, results, fields) {
    console.log("ERROR:", error);
    console.log("RESULTS:", results);
    console.log("FIELDS:", fields);
});


http.createServer(function (request, response) {

    const client = new Client({connectionString: DATABASE_URL});
    // client.connect().then(() => client.query("SELECT * FROM hellotable")).then((result) => {
    //     console.log("RESULTS:", result);
    //     client.end();
    // }).catch((e) => {
    //     console.log("ERROR:", e);
    //     client.end();
    // });
    client.connect().then(() => client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")).then((result) => {
        console.log("RESULTS:", result);
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
            con.query("SELECT * from users WHERE username = ? AND password = ?;", [data.username, data.password], function (error, results, fields) {
                console.log("ERROR:", error);
                console.log("RESULTS:", results);
                // console.log("FIELDS:", fields);
                if (error === null) {
                    if (results.length === 1) {
                        console.log("ONE RESULT FOUND!");
                        response.writeHead(200);
                        response.end();
                    } else {
                        console.log("NO RESULTS FOUND!");
                        response.writeHead(204);
                        response.write("HERE!!!");
                        response.end();
                    }
                } else {
                    response.writeHead(202);
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
            con.query("SELECT * FROM posts WHERE username IN (SELECT following FROM followers WHERE username = ?);", [username], function (error, results, fields) {
                if (error === null) {
                    console.log(JSON.stringify(results));
                    // response.write(JSON.stringify(;
                    response.writeHead(200);
                    response.write(JSON.stringify({"posts": results}));
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
                // con.query("INSERT INTO users VALUES(?, ?, ?)", [data.username, data.password, data.info], function (error, results, fields) {
                //     console.log("ERROR:", error);
                //     console.log("RESULTS:", results);
                //     console.log("FIELDS:", fields);
                //     if (error === null) {
                //         response.writeHead(200);
                //         response.end();
                //     } else {
                //         response.writeHead(202);
                //         response.end();
                //     }
                // });
                client.query("INSERT INTO users VALUES($1, $2)", [data.username, data.password]).then((result) => {
                    console.log("RESULTS:", result);
                    // client.end();
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
            con.query("INSERT INTO posts (username, content) VALUES (?, ?)", [data.username, data.post.content], function (error, results, fields) {
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
            con.query("INSERT INTO followers (username, following) VALUES (?, ?);", [data.username, data.follow], function (error, results, fields) {
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
            con.query("SELECT * FROM users WHERE username = ?;", [data.search_term], function (error, results, fields) {
                if (error == null) {
                    console.log("NO ERROR");
                    if (results.length > 0) {
                        console.log(results);
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
let userinfo = {"username": "chrisha", "password": "123456", "info": "Hi, my name is Christian!"};
model.create_user(userinfo);
let userinfo2 = {"username": "johndoe", "password": "123456", "info": "Hi, my name is John!"};
model.create_user(userinfo2);
model.user_follow("chrisha", "johndoe");
