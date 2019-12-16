var express = require("express");
var app = express();
var path = require("path");
var server = require("http").Server(app);
var io = require("socket.io")(server); // initialize a new instance of socket.io by passing the http server object
var port = process.env.PORT || 3000;

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

var roundTime = 95000; //make timer 95,000 before release
let roundEndTime;
// let curTurnIdx = 0;

//Generate a random Icon images to the player
//var playerIcon="";
const iconFolder = "./public/images/icon";
const fs = require("fs");
const iconFiles = fs.readdirSync(iconFolder);

var secretWord = {
  animal: ["shark","kangaroo","zebra","peacock","camel","turtle","elephant","unicorn","orangutan","owl","fox","armadillo","opossum","llama","clownfish","capybara","shrimp"],
  food: ["apple", "banana", "strawberry", "lollipop", "pumpkin", "pizza", "dumplings", "sushi", "salad", "lasagna","cheesecake", "muffin","croissant", "pineapple","shrimp"],
  random: ["rainbow", "toothpaste", "mermaid", "computer", "microsoft", "table", "oklahoma", "egypt", "fireplace", "xbox", "batman", "money","television","flowers","chair"]
};

io.on("connection", function(socket) {
  //io.emit('userlist', users); //delete this?
  let playerIcon = iconFiles[Math.floor(Math.random() * iconFiles.length)];
  console.log(playerIcon);

  socket.on("canIJoin", function(userName, roomName){

    if(rooms[roomName]!== undefined && rooms[roomName].users.filter(x=>x.userName==userName).length==1){
      return io.to(socket.id).emit("canIJoin","name already exist in room");
      
    }

    else if (rooms[roomName]!== undefined && rooms[roomName].users.length==5){
      return io.to(socket.id).emit("canIJoin","room is full");
    }

    else  return io.to(socket.id).emit("canIJoin","true");

  });



  socket.on("join", function(name, room, past) {
    console.log("EXECUTE JOIN FUNCTION");
    socket.userName = name;
    socket.roundScore = 0;
    socket.totalScore = 0;
    socket.room = room;
    socket.icon = playerIcon;

    if (!rooms[room]) {
      
      rooms[room] = {
        roomName: room,
        users: [],
        history: [],
        secretWord: "",
        roundEndTime: "",
        icon: [],
        round: 1
      };
    }
    rooms[room].users.push(socket);
    socket.join(room);

    if (rooms[room].users.length == 1) {
      rooms[room].roundEndTime = new Date().getTime() + 90000;
      rooms[room].secretWord = generateSecretWord(room);

      console.log(rooms[room].secretWord);
      console.log("round end time" + rooms[room].roundEndTime);

      io.to(socket.id).emit("gameStatus", {
        roomName: rooms[room].roomName,
        secretWord: rooms[room].secretWord,
        roundEndTime: rooms[room].roundEndTime,
        icon: rooms[room].icon,
        drawer: true
      });
    } else {
      io.to(socket.id).emit("gameStatus", {
        roomName: rooms[room].roomName,
        secretWord: rooms[room].secretWord,
        roundEndTime: rooms[room].roundEndTime,
        icon: rooms[room].icon,
        drawer: false
      });
      past(rooms[room].history);

      // io.to(socket.id).emit('timeRemaining', remainingTime); // delete this?
    }

    //update the score board when a new player joined the game
    io.to(room).emit("newPlayer", {
      userNames: rooms[room].users.map(x => x.userName),
      totalScores: rooms[room].users.map(x => x.totalScore),
      icons: rooms[room].users.map(x => x.icon),
      round: rooms[room].round
    });


    io.to(socket.room).emit("playerChange",socket.userName,"joined");

 

    // console.log(socket.rooms);

    // update all clients with the list of users
    // io.emit('userlist', users);
  });

  socket.on("chat message", function(msg) {
    io.to(msg.roomName).emit("hello", msg);
  });

  socket.on("correct answer", function(msg) {
    socket.roundScore = msg.roundScore;
    //socket.totalScore += msg.roundScore;

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
        //rooms[socket.room].users.pop();
        rooms[socket.room].users.shift(); //remove the drawer (the first element) before start the next turn
        startNextRound(socket.room, "Drawer Left!");
      }
      console.log("drawer disconnected");
      // console.log(users.length);
    } else {
      rooms[socket.room].users.splice(
        rooms[socket.room].users.indexOf(socket),
        1
      );


      //update the score board when guesser left the game
      io.to(socket.room).emit("guesserLeft", {
        userNames: rooms[socket.room].users.map(x => x.userName),
        totalScores: rooms[socket.room].users.map(x => x.totalScore),
        icons: rooms[socket.room].users.map(x => x.icon),
        round: rooms[socket.room].round
      });

      console.log("guesser disconnected");
      // console.log(users.length);
    }

    io.to(socket.room).emit("playerChange",socket.userName,"left");
  });
});

let generateSecretWord = function(room) {
  let words;
  if (room == "animal" || room == "food") words = secretWord[room];
  else words = secretWord.random;

  return words[Math.floor(Math.random() * words.length)];
};

let startNextRound = function(roomName, reason) {
  for (let i = 0; i < rooms[roomName].users.length; i++) {
    rooms[roomName].users[i].totalScore += rooms[roomName].users[i].roundScore;
  }
  if (rooms[roomName] != undefined) {
    rooms[roomName].history = [];
    rooms[roomName].round++;
  }

  io.to(roomName).emit("clearScreen");
  rooms[roomName].users.push(rooms[roomName].users.shift());
  // curTurnIdx = (curTurnIdx+1)%users.length;
  console.log(
    "next round: " + rooms[roomName].users[0].userName + " is now the drawer"
  );

  rooms[roomName].secretWord = generateSecretWord(roomName);

  rooms[roomName].roundEndTime = new Date().getTime() + roundTime;

  console.log("round end time" + rooms[roomName].roundEndTime);

  io.to(roomName).emit("roundResults", {
    userNames: rooms[roomName].users.map(x => x.userName),
    roundScores: rooms[roomName].users.map(x => x.roundScore),
    totalScores: rooms[roomName].users.map(x => x.totalScore),
    icons: rooms[roomName].users.map(x => x.icon),
    reason: reason,
    round: rooms[roomName].round
  });


  for (let i = 0; i < rooms[roomName].users.length; i++) {
    if (i == 0) {
      io.to(rooms[roomName].users[i].id).emit("gameStatus", {
        roomName: roomName,
        secretWord: rooms[roomName].secretWord,
        drawer: true,
        icon: rooms[roomName].icon,
        roundEndTime: rooms[roomName].roundEndTime
      });
    } else {
      io.to(rooms[roomName].users[i].id).emit("gameStatus", {
        roomName: roomName,
        secretWord: rooms[roomName].secretWord,
        drawer: false,
        icon: rooms[roomName].icon,
        roundEndTime: rooms[roomName].roundEndTime
      });
    }
    //reset round score to zero
    rooms[roomName].users[i].roundScore = 0;
  }
};