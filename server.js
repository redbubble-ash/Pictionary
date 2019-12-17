var express = require("express");
var app = express();
var path = require("path");
var server = require("http").Server(app);
var io = require("socket.io")(server); // initialize a new instance of socket.io by passing the http server object
var port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log("Server listening at port %d", port);
});
// Routing, serve html
app.use(express.static(path.join(__dirname, "public")));
var rooms = {};
var roundTime = 95000; //make timer 95,000 before release
//Generate a random Icon images to the player
const iconFolder = "./public/images/icon";
const fs = require("fs");
const iconFiles = fs.readdirSync(iconFolder);

var secretWord = {
  animal: ["shark","kangaroo","zebra","peacock","camel","turtle","elephant","unicorn","orangutan","owl","fox","armadillo","opossum","llama","clownfish","capybara","shrimp"],
  food: ["apple", "banana", "strawberry", "lollipop", "pumpkin", "pizza", "dumplings", "sushi", "salad", "lasagna","cheesecake", "muffin","croissant", "pineapple","shrimp"],
  random: ["rainbow", "toothpaste", "mermaid", "computer", "microsoft", "table", "oklahoma", "egypt", "fireplace", "xbox", "batman", "money","television","flowers","chair"]
};
io.on("connection", function(socket) {
  let playerIcon = iconFiles[Math.floor(Math.random() * iconFiles.length)];
  console.log(playerIcon);

  socket.on("canIJoin", loginCheck);
  socket.on("join", initiatePlayer);
  socket.on("draw", onDraw);
  socket.on("clearScreen", onClearScreen);
  socket.on("fillScreen", onFillScreen);
  socket.on("chat message", sendMessage);
  socket.on("correct answer", onCorrectAnswer);
  socket.on("next round", startNextRound);
  socket.on("disconnect", onDisconnect);

  function loginCheck(userName, roomName){

    if(rooms[roomName]!== undefined && rooms[roomName].users.filter(x=>x.userName==userName).length==1){
      return io.to(socket.id).emit("canIJoin","name already exists!");
      
    }

    else if (rooms[roomName]!== undefined && rooms[roomName].users.length==5){
      return io.to(socket.id).emit("canIJoin","room is full!");
    }

    else  return io.to(socket.id).emit("canIJoin","true");

  }

  function initiatePlayer(name, room, past) {
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
    }
    //update the score board when a new player joined the game
    io.to(room).emit("newPlayer", {
      userNames: rooms[room].users.map(x => x.userName),
      totalScores: rooms[room].users.map(x => x.totalScore),
      icons: rooms[room].users.map(x => x.icon),
      round: rooms[room].round
    });
    io.to(socket.room).emit("playerChange",socket.userName,"joined");
  }

  function onDraw(line) {
    socket.to(socket.room).broadcast.emit("draw", line);
    //store the drawing history
    rooms[socket.room].history.push(line);
  }

  function onClearScreen() {
    rooms[socket.room].history = [];
    io.to(socket.room).emit("clearScreen");
  }

  function onFillScreen(colour) {
    io.emit("fillScreen", colour);
  }

  function sendMessage(msg) {
    io.to(msg.roomName).emit("hello", msg);
  }

  function onCorrectAnswer(msg) {
    socket.roundScore = msg.roundScore;
    io.to(socket.room).emit("correct answer", msg);
  }

  function onDisconnect(){

    if(socket.room != undefined){
      if (rooms[socket.room].users[0] == socket) {
        if (rooms[socket.room].users.length == 1) {
          delete rooms[socket.room];
        } else {
          rooms[socket.room].users.shift(); //remove the drawer (the first element) before start the next turn
          startNextRound(socket.room, "Drawer Left!");
        }
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
      }
      io.to(socket.room).emit("playerChange",socket.userName,"left");

    }

   
  }
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
  rooms[roomName].secretWord = generateSecretWord(roomName);
  rooms[roomName].roundEndTime = new Date().getTime() + roundTime;
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