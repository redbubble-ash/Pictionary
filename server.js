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

var roundTime = 20000; //make timer 60,000
let roundEndTime;

// let curTurnIdx = 0;

var words = ["apple", "banana", "orange", "strawberry", "kiwi", "star fruit"];
var secretWord;

io.on("connection", function(socket) {
  //io.emit('userlist', users);

  socket.on("join", function(name, room, past) {
    socket.userName = name;
    socket.roundScore = 0;
    socket.totalScore = 0;
    socket.room = room;

    if (!rooms[room]) {
      console.log("room doesn't exist");
      rooms[room] = {
        roomName: room,
        users: [],
        history: [],
        secretWord: "",
        roundEndTime: ""
      };
    }
    rooms[room].users.push(socket);
    socket.join(room);

    if (rooms[room].users.length == 1) {
      rooms[room].roundEndTime = new Date().getTime() + roundTime;
      rooms[room].secretWord = generateSecretWord();

      console.log(rooms[room].secretWord);
      console.log("round end time" + rooms[room].roundEndTime);
      io.to(socket.id).emit("gameStatus", {
        roomName: rooms[room].roomName,
        secretWord: rooms[room].secretWord,
        roundEndTime: rooms[room].roundEndTime,
        drawer: true
      });
    } else {
      io.to(socket.id).emit("gameStatus", {
        roomName: rooms[room].roomName,
        secretWord: rooms[room].secretWord,
        roundEndTime: rooms[room].roundEndTime,
        drawer: false
      });
      past(rooms[room].history);
      // io.to(socket.id).emit('timeRemaining', remainingTime);
    }

    // console.log(socket.rooms);

    // update all clients with tche list of users
    // io.emit('userlist', users);
  });

  socket.on("chat message", function(msg) {
    io.to(msg.roomName).emit("hello", msg);

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

  //   socket.on('timer',function(count){
  //     remainingTime = count;
  //     io.emit("timer", count);
  //     console.log("timer remaining: "+ remainingTime);
  // })

  socket.on("correct answer", function(msg) {
    socket.roundScore = msg.roundScore;
    socket.totalScore += msg.roundScore;

    io.to(socket.room).emit("correct answer", msg);
  });

  socket.on("next round", startNextRound);

  socket.on("draw", function(line) {
    socket.to(socket.room).broadcast.emit("draw", line);
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
        startNextRound(socket.room);
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

let startNextRound = function(roomName) {
  if(rooms[roomName]!= undefined){
    rooms[roomName].history = [];

  }
  

  io.to(roomName).emit("roundResults", {
    userNames: rooms[roomName].users.map(x => x.userName),
    roundScores: rooms[roomName].users.map(x => x.roundScore),
    totalScores: rooms[roomName].users.map(x => x.totalScore)
  });


  // function sleep(milliseconds) {
  //   let timeStart = new Date().getTime();
  //   while (true) {
  //   let elapsedTime = new Date().getTime() - timeStart;
  //   if (elapsedTime > milliseconds) {
  //     break;
  //   }
  //   }
  // }

  // sleep(5000);

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
        roundEndTime: rooms[roomName].roundEndTime
      });
    } else {
      io.to(rooms[roomName].users[i].id).emit("gameStatus", {
        roomName: roomName,
        secretWord: rooms[roomName].secretWord,
        drawer: false,
        roundEndTime: rooms[roomName].roundEndTime
      });
    }
  }
};
