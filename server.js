var express = require("express");
var app = express();
var path = require("path");
var server = require("http").Server(app);
var io = require("socket.io")(server); // initialize a new instance of socket.io by passing the http server object
var port = 3000;

let main = "./public/main.js";

server.listen(port, () => {
    console.log("Server listening at port %d", port);
});

// Routing, serve html
app.use(express.static(path.join(__dirname, "public")));

var users = [];

io.on("connection", function (socket) {
    //io.emit('userlist', users);

    socket.on('join', function (name) {
        socket.userName = name;

        // user automatically joins a room under their own name
        socket.join(name);
        console.log(socket.userName + ' has joined. ID: ' + socket.id);

        // save the name of the user to an array called users
        users.push(socket.userName);

        // update all clients with the list of users
		io.emit('userlist', users);
		

    })

    socket.on("chat message", function (msg) {
        io.emit("hello", msg);
    });

    socket.on("correct answer", function (msg) {
        io.emit("correct answer", msg)
    })

    socket.on('draw', function (line) {
        socket.broadcast.emit('draw', line);
    })

    socket.on("clearScreen", function(){
        io.emit("clearScreen");
    });

    socket.on("fillScreen", function(colour){
        io.emit("fillScreen", colour);
    })
});