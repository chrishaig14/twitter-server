let http = require("http");
let fs = require("fs");

http.createServer(function (request, response){
    console.log("request url: ", request.url);
    if (request.url === "/") {
        fs.readFile("client/index.html", function (err, data) {
            response.writeHead(200, {"Content-Type": "text/html"});
            response.write(data);
            response.end();
        })
    }
    if (request.url === "/login") {
        let body = [];
        request.on("data",chunk => {
            body.push(chunk);
        });
        request.on("end", ()=>{
            body = Buffer.concat(body).toString();
            console.log(body);
        });

        response.writeHead(200,{"Content-Type":"text/json"});
        response.write({"token":"1234"}.toString());
        response.end();
    }
    if (request.url ==="/styles.css"){
        fs.readFile("client/styles.css", function (err, data) {
            response.writeHead(200, {"Content-Type": "text/css"});
            response.write(data);
            response.end();
        })
    }
    if (request.url ==="/app.js"){
        fs.readFile("client/app.js", function (err, data) {
            response.writeHead(200, {"Content-Type": "application/javascript"});
            response.write(data);
            response.end();
        })
    }
    if (request.url ==="/main.js"){
        fs.readFile("client/main.js", function (err, data) {
            response.writeHead(200, {"Content-Type": "application/javascript"});
            response.write(data);
            response.end();
        })
    }
    if (request.url ==="/style_feed.css"){
        fs.readFile("client/style_feed.css", function (err, data) {
            response.writeHead(200, {"Content-Type": "text/css"});
            response.write(data);
            response.end();
        })
    }
    if(request.url === "/feed"){
        fs.readFile("client/feed.html", function (err, data) {
            response.writeHead(200, {"Content-Type": "text/html"});
            response.write(data);
            response.end();
        })
    }
    if (request.url === "/post") {
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
    }


}).listen(8888);