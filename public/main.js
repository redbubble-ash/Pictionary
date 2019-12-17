$(document).ready(function() {
  let socket = io(); // load socket.io-client. exposes a io global, and then connect? does not specify URL, defaults to trying to connect to the host that serves the page
  let userName;
  let drawer; // current player status true/false
  let secretWord;
  let roomName;
  let reason;
  let guessed = false; // prevent double score in one around
  let index1; //These three are for the hint maker
  let index2;
  let index3;
  let lineSize = 2;
  let colour = "black";

  // --------------------------------------- LOGIN START GAME --------------------------------------
  loginSucceed();
  socket.on("gameStatus", startGame);

  function loginSucceed() {
    $(".grey-out").fadeIn(500);
    $("#room").on("change", function() {
      if (this.value === "custom") {
        $("#roomName").css("visibility", "visible");
      } else {
        $("#roomName").css("visibility", "hidden");
      }
    });
    $(".user").submit(function() {
      event.preventDefault();
      userName = $("#userName")
        .val()
        .trim();
      let roomName = $("#room :selected").val();
      if (roomName == "custom") {
        roomName = $("#roomName")
          .val()
          .trim();
      }
      $("#userNameErrorMsg").empty();
      $("#roomErrorMsg").empty();
      if (userName === "") {
        $("#userNameErrorMsg").text("name cannot be empty");
        return;
      }
      socket.emit("canIJoin", userName, roomName);
      checkLogIn().then(function(value) {
        if (value=='true') {
          $("#newUser").html("Log in succeed: " + userName);
          socket.emit("join", userName, roomName, function(past) {
            past.forEach(line => draw(line));
          });
          $("body").css({
            "background-image": "url(" + "/images/bkgbees.jpg" + ")",
            "background-size": "initial",
            "background-repeat": "repeat"
          });
          $(".grey-out").fadeOut(300);
          $(".game").css("visibility", "visible");
          //update the score board when a new player joined the game
          socket.on("newPlayer", scoreBoardDisplay);
        }
      });
    });
  }
  async function checkLogIn() {
    return new Promise(resolve => {
      socket.on("canIJoin", function(msg) {
        if(msg === 'name already exist in room'){
          $("#userNameErrorMsg").text("name already exist in room");
        }
        else if (msg=="room is full"){
          $("#roomErrorMsg").text("room is full");
        }
        resolve(msg);
      });
    });
  }

  // initialize scoreboard
  const scoreBoardDisplay = function(results) {
    let names = results.userNames;
    let totalScores = results.totalScores;
    let playerIcons = results.icons;
    let gameRound = results.round;
    $("#roundResults").empty();
    $("#timesUp").empty();
    $("#roundresults").empty();
    //update the score board
    let scores = [];
    for (let i = 0; i < names.length; i++) {
      scores.push(totalScores[i]);
      scores = scores.sort((a, b) => b - a);
    }
    for (let i = 0; i < names.length; i++) {
      function findScore(score) {
        return score === totalScores[i];
      }
      let rank = scores.findIndex(findScore);
      rank++;
      let $scoreList = $(
        "<div style='display = flex; align-items: center; font-weight:bold'>"
      );
      $scoreList.append(
        "<p style='text-align: center;float:left'><span style='color:red'>" +
          "# " +
          rank +
          "&nbsp;&nbsp;&nbsp" +
          "</span>" +
          "<span style='color:blue'>" +
          names[i] +
          "</span>" +
          "&nbsp;&nbsp;&nbsp" +
          "<span style='color:red'> " +
          totalScores[i] +
          "</span></p>"
      );
      let $icon;
      if (i === 0) {
        $icon = $(
          "<p><img style='width = '30' height = '30'; font-weight:bold;text-align: center;float:right' src='./images/icon/" +
            playerIcons[i] +
            "' alt='player icon'>" +
            "&nbsp;&nbsp" +
            "</img><img style='width = '30' height = '30'; font-weight:bold;text-align: center;float:right' src='./images/051-bee.png'  alt='drawer icon'></img></p>"
        );
      } else {
        $icon = $(
          "<p><img style='width = '30' height = '30'; font-weight:bold;text-align: center;float:right' src='./images/icon/" +
            playerIcons[i] +
            "' alt='player icon'></img></p>"
        );
      }
      $scoreList.append($icon);
      $("#roundresults").append($scoreList);
      $("#roundInfo").text("Round " + gameRound);
    }
  };

  function startGame(status) {
    console.log(userName + " has joined " + status.roomName); // check if correct room is logged in with dropdown menu
    drawer = status.drawer;
    roomName = status.roomName;
    secretWord = status.secretWord;
    roundEndTime = status.roundEndTime;
    icon = status.icon;
    guessed = false;
    index1 = Math.floor(Math.random() * secretWord.length); // these make a new index each round for the hinter
    index2 = noMatch12();
    index3 = noMatch123();
    function noMatch12() { // the noMatch functions ensure unique letters for 5-letter words and above
      temp = Math.floor(Math.random() * secretWord.length);
      if (secretWord.length === 4) {//causes only two unique letters for four letter words
        temp = index1;
      } else if (temp === index1) {
        noMatch12();
      }
      return temp;
    }
    function noMatch123() {
      temp = Math.floor(Math.random() * secretWord.length);
      if (secretWord.length === 3) {// only reveals one letter for three letter words
        temp = index1;
        index2 = index1;
      } else if (temp === index1 || temp === index2) {
        noMatch123();
      }
      return temp;
    }
    $("#currentRoom").text("Room: " + roomName);

    ChangeBoardFeature(drawer);
    
    startDrawing();
    countDownTimer;
  }

  function ChangeBoardFeature(drawer){
    if (drawer) {
      document.getElementById("chatSend").innerHTML = "Give up turn?";
      document.getElementById("messageInput").value =
        "I give up and cant draw this.";
      document.getElementById("messageInput").style.display = "none";
      let artButtons = document.getElementsByClassName("drawTools");
      for (let i = 0; i < artButtons.length; i++) {
        artButtons[i].style.visibility = "visible";
      }
    }
    if (!drawer) {
      document.getElementById("chatSend").innerHTML = "send";
      document.getElementById("messageInput").value = "";
      document.getElementById("messageInput").style.display = "block";
      let artButtons = document.getElementsByClassName("drawTools");
      for (let i = 0; i < artButtons.length; i++) {
        artButtons[i].style.visibility = "hidden";
      }
    }

  }

 // ---------------------------------------------- HINT MAKER -----------------------------------------
 function dashMaker(secretWord) {
  return secretWord.replace(/[a-zA-Z]/g, "_");
}

 let newHint = "";
  function hintMaker(word, seconds) {
    let hint = dashMaker(word);
    //console.log(hint)
    newHint = hint;
    if (seconds <= 60) {
      newHint =
        hint.substring(0, index1) + word[index1] + hint.substring(index1 + 1);
    }
    if (seconds <= 30) {
      newHint =
        newHint.substring(0, index2) +
        word[index2] +
        newHint.substring(index2 + 1);
    }
    if (seconds <= 10) {
      newHint =
        newHint.substring(0, index3) +
        word[index3] +
        newHint.substring(index3 + 1);
    }
    return newHint;
  }
 

 // ------------------------------------------------ GAME TIMER --------------------------------------------
 
  function gameTimer() {
    let now = new Date().getTime();
    let distance = roundEndTime - now;
    let seconds = Math.floor(distance / 1000);
    document.getElementById("secretword").innerHTML = drawer
      ? secretWord
      : hintMaker(secretWord, seconds);
    $("#timer").html(seconds + " Seconds");
    if (distance <= 0 && drawer) {
      reason = "Time's up!";
      socket.emit("next round", roomName, reason);
    }
  }
  var countDownTimer = setInterval(gameTimer, 1000);


  // ------------------------------------------- CHAT AREA --------------------------------------------------

  socket.on("hello", onMessage);
  socket.on("correct answer", onCorrectAnswer);
  socket.on("playerChange", onPlayerChange);
  $("#messagesForm").submit(checkAnswer);


  function onMessage(msg){
    $(".messages").append($("<ul>").text(msg.userName + ": " + msg.msg));

    $(".messages").scrollTop($(".messages")[0].scrollHeight);
  };

  function onCorrectAnswer(msg) {
    $(".messages").append(
      $("<ul>")
        .text(msg.userName + " has the correct answer!")
        .css("color", "green")
    );
    $(".messages").scrollTop($(".messages")[0].scrollHeight);
  };

  function onPlayerChange(name, status) {
    $(".messages").append(
      $("<ul>")
        .text(name + " has " + status + " the room.")
        .css("color", "red")
    );
    $(".messages").scrollTop($(".messages")[0].scrollHeight);
  }

  function checkAnswer(){
    if (drawer) {
      reason = "Drawer Gave up!";
      socket.emit("next round", roomName, reason);
    }

    let isAMatch = false;
    let toBeEval = $("#messageInput").val(); // sets input to a nicer variable
    if (toBeEval.toLowerCase().search(secretWord) >= 0) {
      // makes the whole string lowercase and searches for the correct string, search returns index -1 if not found
      isAMatch = true;
    }

    if (!isAMatch) {
      socket.emit("chat message", {
        roomName: roomName,
        userName: userName,
        msg: $("#messageInput").val()
      });
    }

    if (isAMatch && !guessed) {
      guessed = true;
      socket.emit("correct answer", {
        userName: userName,
        roundScore: 50
      });
      isAMatch = false; // resets isAMatch to false
      //socket.emit("next round");
    }
    $("#messageInput").val("");
    return false;
  }




  // ------------------------------------- SCOREBOARD ROUND RESULTS ----------------------------------------

  //update the score board when guesser left the game
  socket.on("guesserLeft", scoreBoardDisplay);
  socket.on("roundResults", onRoundResults);
  function onRoundResults(results) {
    $("#timer").hide();
    let names = results.userNames;
    let roundScores = results.roundScores;
    let totalScores = results.totalScores;
    let reasonNextRound = results.reason;
    let playerIcons = results.icons;
    let gameRound = results.round;
    $("#roundResults").empty();
    $("#secretWord").empty();
    $("#timesUp").empty();
    $("#roundresults").empty();
    //Popup window
    $(".hover_bkgr_fricc").show();
    $("#secretWord").append("The word was " + secretWord);
    $("#timesUp").append(reasonNextRound);
    for (let i = 0; i < names.length; i++) {
      let $playerList = $(
        "<div style ='font-weight: bold;height:40px; font-size:x-large' class='row''> <div style='color:blue;text-align: left' class='col-5''>" +
          names[i] +
          "</div><div style='color:red;text-align: left' class='col-5''>" +
          "+ " +
          roundScores[i] +
          "</div></div>"
      );
      $("#roundResults").append($playerList);
    }
    setTimeout(() => {
      $(".hover_bkgr_fricc").fadeOut("slow");
    }, 5000);
    setTimeout(() => {
      $("#timer").show();
    }, 5000);
    //update the score board
    let scores = [];
    for (let i = 0; i < names.length; i++) {
      scores.push(totalScores[i]);
      scores = scores.sort((a, b) => b - a);
    }
    for (let i = 0; i < names.length; i++) {
      function findScore(score) {
        return score === totalScores[i];
      }
      let rank = scores.findIndex(findScore);
      rank++;
      let $scoreList = $(
        "<div style='display = flex; align-items: center; font-weight:bold'>"
      );
      $scoreList.append(
        "<p style='text-align: center;float:left'><span style='color:red'>" +
          "# " +
          rank +
          "&nbsp;&nbsp;&nbsp" +
          "</span>" +
          "<span style='color:blue'>" +
          names[i] +
          "</span>" +
          "&nbsp;&nbsp;&nbsp" +
          "<span style='color:red'> " +
          totalScores[i] +
          "</span></p>"
      );
      let $icon;
      if (i === 0) {
        $icon = $(
          "<p><img style='width = '30' height = '30'; font-weight:bold;text-align: center;float:right' src='./images/icon/" +
            playerIcons[i] +
            "' alt='player icon'>" +
            "&nbsp;&nbsp" +
            "</img><img style='width = '30' height = '30'; font-weight:bold;text-align: center;float:right' src='./images/051-bee.png'  alt='drawer icon'></img></p>"
        );
      } else {
        $icon = $(
          "<p><img style='width = '30' height = '30'; font-weight:bold;text-align: center;float:right' src='./images/icon/" +
            playerIcons[i] +
            "' alt='player icon'></img></p>"
        );
      }
      $scoreList.append($icon);
      $("#roundresults").append($scoreList);
      $("#roundInfo").text("Round " + gameRound);
    }
  }

  // ----------------------------------------------- DRAWING AREA --------------------------------------------
  let canvas = document.getElementById("drawArea");
  let ctx = canvas.getContext("2d");
  if (window.innerWidth >= 1300) {
    canvas.width = 800;
    canvas.height = 600;
  } else {
    canvas.width = 640;
    canvas.height = 480;
  }
  let startX, startY, endX, endY;
  let mouse = {
    x: 0,
    y: 0
  };
  var startDrawing = function() {
    canvas.onmousemove = function(e) {
      mouse.x = e.pageX - $(this).offset().left;
      mouse.y = e.pageY - $(this).offset().top;
      endX = mouse.x;
      endY = mouse.y;
    };
    /* Drawing on Paint App */
    canvas.onmousedown = function(e) {
      startX = mouse.x;
      startY = mouse.y;
      canvas.addEventListener("mousemove", onPaint, false);
    };
    canvas.onmouseup = function() {
      canvas.removeEventListener("mousemove", onPaint, false);
    };
    canvas.onmouseout = function() {
      canvas.removeEventListener("mousemove", onPaint, false);
    };
    var onPaint = function() {
      if (drawer) {
        ctx.strokeStyle = colour;
        ctx.lineWidth = lineSize;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      var line = {
        from: {
          x: startX,
          y: startY
        },
        to: {
          x: endX,
          y: endY
        },
        strokeStyle: colour,
        lineWidth: lineSize,
        originalWidth: canvas.width,
        originalHeight: canvas.height
      };
      if (drawer) {
        socket.emit("draw", line, canvas.width);
      }
      startX = endX;
      startY = endY;
    };
  };
  /* Mouse Capturing Work */
  socket.on("draw", draw);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  //this begins colour controls
  function colorWindowChanger(color){
    document.getElementById("colorWindow").style.background = color
  }
  colorWindowChanger(colour);
  document.getElementById("red").onclick = function() {
    colour = "red";
    colorWindowChanger(colour);
  };
  document.getElementById("orange").onclick = function() {
    colour = "orange";
    colorWindowChanger(colour);
  };
  document.getElementById("yellow").onclick = function() {
    colour = "yellow";
    colorWindowChanger(colour);
  };
  document.getElementById("green").onclick = function() {
    colour = "green";
    colorWindowChanger(colour);
  };
  document.getElementById("blue").onclick = function() {
    colour = "blue";
    colorWindowChanger(colour);
  };
  document.getElementById("purple").onclick = function() {
    colour = "rebeccapurple";
    colorWindowChanger(colour);
  };
  document.getElementById("brown").onclick = function() {
    colour = "sienna";
    colorWindowChanger(colour);
  };
  document.getElementById("black").onclick = function() {
    colour = "black";
    colorWindowChanger(colour);
  };
  document.getElementById("dimGray").onclick = function() {
    colour = "dimgray";
    colorWindowChanger(colour);
  };
  //second row
  document.getElementById("white").onclick = function() {
    colour = "white";
    colorWindowChanger(colour);
  };
  document.getElementById("pink").onclick = function() {
    colour = "pink";
    colorWindowChanger(colour);
  };
  document.getElementById("tomato").onclick = function() {
    colour = "tomato";
    colorWindowChanger(colour);
  };
  document.getElementById("goldenrod").onclick = function() {
    colour = "goldenrod";
    colorWindowChanger(colour);
  };
  document.getElementById("chartreuse").onclick = function() {
    colour = "chartreuse";
    colorWindowChanger(colour);
  };
  document.getElementById("skyblue").onclick = function() {
    colour = "skyblue";
    colorWindowChanger(colour);
  };
  document.getElementById("fuchsia").onclick = function() {
    colour = "fuchsia";
    colorWindowChanger(colour);
  };
  document.getElementById("tan").onclick = function() {
    colour = "tan";
    colorWindowChanger(colour);
  };
  document.getElementById("lightGray").onclick = function() {
    colour = "lightgray";
    colorWindowChanger(colour);
  };
  //size changing
  document.getElementById("xSmaller").onclick = function() {
    lineSize = 2;
  };
  document.getElementById("small").onclick = function() {
    lineSize = 5;
  };
  document.getElementById("medium").onclick = function() {
    lineSize = 10;
  };
  document.getElementById("large").onclick = function() {
    lineSize = 20;
  };
  document.getElementById("xLarger").onclick = function() {
    lineSize = 30;
  };
  // canvas clear functions
  document.getElementById("clear").onclick = function() {
    socket.emit("clearScreen");
  };
  function clearScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  socket.on("clearScreen", clearScreen);
  // canvas fill function
  document.getElementById("fill").onclick = function() {
    socket.emit("fillScreen", colour);
  };
  socket.on("fillScreen", fillScreen);
  function fillScreen(colour) {
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
  }
  disableDrawing();
  socket.on("draw", draw);
  function draw(line) {
    ctx.strokeStyle = line.strokeStyle;
    ctx.lineWidth = line.lineWidth;
    let scaleFactorWidth = canvas.width / line.originalWidth;
    let scaleFactorHeight = canvas.height / line.originalHeight;
    ctx.beginPath();
    ctx.moveTo(line.from.x * scaleFactorWidth, line.from.y * scaleFactorHeight);
    ctx.lineTo(line.to.x * scaleFactorWidth, line.to.y * scaleFactorHeight);
    ctx.closePath();
    ctx.stroke();
  }
  canvas.onmousedown = function(e) {
    startX = mouse.x;
    startY = mouse.y;
    canvas.addEventListener("mousemove", onPaint, false);
  };
  canvas.onmouseup = function() {
    canvas.removeEventListener("mousemove", onPaint, false);
  };
  var onPaint = function() {
    ctx.strokeStyle = colour; //allows color to change
    ctx.lineWidth = lineSize; // allows size to change
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    var line = {
      from: {
        x: startX,
        y: startY
      },
      to: {
        x: endX,
        y: endY
      },
      strokeStyle: colour,
      lineWidth: ctx.lineWidth
    };
    socket.emit("draw", line); //sends line through socket
    startX = endX;
    startY = endY;
  };
  // disable buttons when it's not user's turn to draw
  function disableDrawing() {
    var buttons = document.getElementsByClassName("painting");
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("disabled", "disabled");
    }
  }
});
