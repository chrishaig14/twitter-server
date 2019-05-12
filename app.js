let http = require("http");
let fs = require("fs");
let mysql = require("mysql");
let con = mysql.createConnection({host: "localhost", user: "root", password: "root"});
con.connect(function (err) {
    if (err) throw err;
    console.log("Connected");
});
con.query("USE twitter;", function (error, results, fields) {
    console.log("ERROR:", error);
    console.log("RESULTS:", results);
    console.log("FIELDS:", fields);
});
http.createServer(function (request, response) {
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
    } else if (request.url === "/feed.js") {
        fs.readFile("client/feed.js", function (err, data) {
            response.writeHead(200, {"Content-Type": "application/javascript"});
            response.write(data);
            response.end();
        })
    } else if (request.url === "/signup.js") {
        fs.readFile("client/signup.js", function (err, data) {
            response.writeHead(200, {"Content-Type": "application/javascript"});
            response.write(data);
            response.end();
        })
    } else if (request.url === "/style_feed.css") {
        fs.readFile("client/style_feed.css", function (err, data) {
            response.writeHead(200, {"Content-Type": "text/css"});
            response.write(data);
            response.end();
        })
    } else if (request.url === "/feed") {
        fs.readFile("client/feed.html", function (err, data) {
            response.writeHead(200, {"Content-Type": "text/html"});
            response.write(data);
            response.end();
        })
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
                con.query("INSERT INTO users VALUES(?, ?, ?)", [data.username, data.password, data.info], function (error, results, fields) {
                    console.log("ERROR:", error);
                    console.log("RESULTS:", results);
                    console.log("FIELDS:", fields);
                    if (error === null) {
                        response.writeHead(200);
                        response.end();
                    } else {
                        response.writeHead(202);
                        response.end();
                    }
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
        });
        response.writeHead(200);
        response.end();
    } else {
        console.log("NOT FOUND!");
        response.writeHead(404);
        response.end();
    }


}).listen(8888);

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
