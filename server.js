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
var canvas = [];
// let curTurnIdx = 0;

var words = ['apple','banana','orange','strawberry'];

io.on("connection", function (socket) {
    //io.emit('userlist', users);

    socket.on('join', function (name) {
        socket.userName = name;

        // user automatically joins a room under their own name
        // socket.join(name);
        console.log(socket.userName + ' has joined. ID: ' + socket.id);

        // save the name of the user to an array called users
        users.push(socket);
        console.log(users);
        console.log(users.indexOf(socket));

        if(users.length==1){
            socket.join('drawer');
            // io.to(socket.id).emit('your turn');
            console.log(name + " joined drawer");
            let sw = words[Math.floor(Math.random()*words.length)];
            console.log(sw);
            io.to('drawer').emit('secretWord', sw);
        }
        else{
            socket.join('guesser');
            console.log(name + " joined guesser");
        }

        // console.log(socket.rooms);
        // update all clients with tche list of users
        // io.emit('userlist', users);
        

		

    });

    socket.on("chat message", function (msg) {
        io.emit("hello", msg);
        
        // io.to('guesser').emit('hello', msg);
        // users[curTurnIdx].leave('drawer');
        // console.log(users[curTurnIdx].userName + "left drawer");
        // users[curTurnIdx].join('guesser');
        // console.log(users[curTurnIdx].userName + "join guesser");
        // users[curTurnIdx+1].leave('guesser');
        // console.log(users[curTurnIdx].userName + "left guesser");
        // users[curTurnIdx+1].join('drawer');
        // console.log(users[curTurnIdx+1].userName + "join drawer");
        // if(users[curTurnIdx]==socket){
        //     socket.leave('drawer');
        //     console.log('left drawer');
        //     socket.join('guesser');
        //     console.log('join guesser');
        // }
       
        // socket.join('drawer');
        // console.log()
    });

    socket.on("correct answer", function (msg) {
        io.emit("correct answer", msg)
    });

    socket.on('next round',function(){
        users[0].leave('drawer');
        users[0].join('guesser');
        users.push(users.shift());
        // curTurnIdx = (curTurnIdx+1)%users.length;
        users[0].leave('guesser');
        users[0].join('drawer');

        console.log('next round: ' + users[0].userName + " is now the drawer");
        let sw = words[Math.floor(Math.random()*words.length)];
        console.log(sw);
        io.to('drawer').emit('secretWord', sw);
    })

    socket.on('draw', function (line) {
        socket.broadcast.emit('draw', line);
    });

    socket.on("clearScreen", function(){
        io.emit("clearScreen");
    });

    socket.on("fillScreen", function(colour){
        io.emit("fillScreen", colour);
    });
    // TODO: trigger next round when drawer left
    socket.on('disconnect',()=>{
        if(users[0]==socket){
            users.splice(users.indexOf(socket),1);
            console.log('drawer disconnected');
            console.log(users.length);
        }
        else{
            users.splice(users.indexOf(socket),1);
            console.log('guesser disconnected');
            console.log(users.length);
        }
    })
});


let secretWord = function(){
    return words[Math.random(words.length)];
}
