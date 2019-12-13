var express = require("express");
var app = express();
var path = require("path");
var server = require("http").Server(app);
var io = require("socket.io")(server); // initialize a new instance of socket.io by passing the http server object
var port = process.env.PORT ||3000 ;

let main = "./public/main.js";

server.listen(port, () => {
  console.log("Server listening at port %d", port);
});

// Routing, serve html
app.use(express.static(path.join(__dirname, "public")));

var rooms = {};
var users = [];
var canvas = [];
var history = [];
// var remainingTime;
var roundStartTime;

var roundTime = 150000; //make timer 95,000 before release
let roundEndTime;
// let curTurnIdx = 0;

var words = ["apple", "banana", "orange", "strawberry", "kiwi", "star fruit", "antidisestablishmentarianism"];
var secretWord;

io.on("connection", function(socket) {
  //io.emit('userlist', users);

  socket.on("join", function(name, room, past) {
    socket.userName = name;
    socket.roundScore = 0;
    socket.totalScore = 0;
    socket.room = room;
    socket.icon = "/images/flower1.png";

    if (!rooms[room]) {
      console.log("room doesn't exist");
      rooms[room] = {
        roomName: room,
        users: [],
        history: [],
        secretWord: "",
        roundEndTime: "",
        round: 1
      };
    }
    rooms[room].users.push(socket);
    socket.join(room);

    if (rooms[room].users.length == 1) {
      rooms[room].roundEndTime = new Date().getTime() + roundTime;
      rooms[room].secretWord = generateSecretWord();

      console.log(rooms[room].secretWord);
      console.log("round end time" + rooms[room].roundEndTime);

      // io.to(socket.room).emit("newPlayer",{
      //   userName: socket.userName,
      //   playerTotal: rooms[roomName].users.length
      // })


      io.to(socket.id).emit("gameStatus", {
        roomName: rooms[room].roomName,
        secretWord: rooms[room].secretWord,
        roundEndTime: rooms[room].roundEndTime,
        icon: socket.icon,
        drawer: true
      });
    } else {
      io.to(socket.id).emit("gameStatus", {
        roomName: rooms[room].roomName,
        secretWord: rooms[room].secretWord,
        roundEndTime: rooms[room].roundEndTime,
        icon: socket.icon,
        drawer: false
      });
      past(rooms[room].history);
      // io.to(socket.id).emit('timeRemaining', remainingTime);
    }

    // console.log(socket.rooms);

    // update all clients with the list of users
    // io.emit('userlist', users);
  });

  socket.on("chat message", function(msg) {
    io.to(msg.roomName).emit("hello", msg);
  });

  socket.on("correct answer", function(msg) {
    socket.roundScore = msg.roundScore;
    socket.totalScore += msg.roundScore;

    io.to(socket.room).emit("correct answer", msg);
  });

  socket.on("next round", startNextRound);

  socket.on("draw", function(line, originalWidth) {
    socket.to(socket.room).broadcast.emit("draw", line, originalWidth);
    //store the drawing history
    rooms[socket.room].history.push(line);
  });

  socket.on("clearScreen", function() {
    rooms[socket.room].history = [];
    io.to(socket.room).emit("clearScreen");
  });

  socket.on("fillScreen", function(colour) {
    io.emit("fillScreen", colour);
  });
  // TODO: trigger next round when drawer left
  socket.on("disconnect", () => {
    if (rooms[socket.room].users[0] == socket) {
      if (rooms[socket.room].users.length == 1) {
        delete rooms[socket.room];
      } else {
        startNextRound(socket.room, "Drawer Left!");
        rooms[socket.room].users.pop();
      }
      console.log("drawer disconnected");
      // console.log(users.length);
    } else {
      rooms[socket.room].users.splice(
        rooms[socket.room].users.indexOf(socket),
        1
      );
      console.log("guesser disconnected");
      // console.log(users.length);
    }
  });
});

let generateSecretWord = function() {
  return words[Math.floor(Math.random() * words.length)];
};

let startNextRound = function(roomName, reason) {
  if(rooms[roomName]!= undefined){
    rooms[roomName].history = [];
    rooms[roomName].round++;
  }
  

  io.to(roomName).emit("roundResults", {
    userNames: rooms[roomName].users.map(x => x.userName),
    roundScores: rooms[roomName].users.map(x => x.roundScore),
    totalScores: rooms[roomName].users.map(x => x.totalScore),
    reason: reason,
    round: rooms[roomName].round
  });

  console.log("REASON IS " + reason);

  io.to(roomName).emit("clearScreen");
  rooms[roomName].users.push(rooms[roomName].users.shift());
  // curTurnIdx = (curTurnIdx+1)%users.length;
  console.log(
    "next round: " + rooms[roomName].users[0].userName + " is now the drawer"
  );
  
  
  
  rooms[roomName].secretWord = generateSecretWord();

  rooms[roomName].roundEndTime = new Date().getTime() + roundTime;

  console.log("round end time" + rooms[roomName].roundEndTime);

  for (let i = 0; i < rooms[roomName].users.length; i++) {
    if (i == 0) {
      io.to(rooms[roomName].users[i].id).emit("gameStatus", {
        roomName: roomName,
        secretWord: rooms[roomName].secretWord,
        drawer: true,
        //icon: socket.icon,
        roundEndTime: rooms[roomName].roundEndTime
      });
    } else {
      io.to(rooms[roomName].users[i].id).emit("gameStatus", {
        roomName: roomName,
        secretWord: rooms[roomName].secretWord,
        drawer: false,
        //icon: socket.icon,
        roundEndTime: rooms[roomName].roundEndTime
      });
    }
  }
};
