$(document).ready(function () {
  let socket = io(); // load socket.io-client. exposes a io global, and then connect? does not specify URL, defaults to trying to connect to the host that serves the page
  let userName;
  //let conversation = ""; delete this?
  let drawer;
  let secretWord;
  let roomName;
  let guessed = false;
  let reason;
  //let icon; delete this?
  let index1; //These three are for the hint maker
  let index2;
  let index3;


  // Login
  function loginSucceed() {
    // $(".game").toggle();
    $(".grey-out").fadeIn(500);

    $("#room").on("change", function () {
      if (this.value === "custom") {
        $("#roomName").css("visibility", "visible");
      } else {
        $("#roomName").css("visibility", "hidden");
      }
    });

    $(".user").submit(function () {
      
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


      if(userName===''){
        $("#userNameErrorMsg").text("name cannot be empty");
        return false;
      }

      socket.emit("canIJoin", userName, roomName);
      socket.on("canIJoin",function(msg){
        if(msg=="true"){
          $("#newUser").html("Log in succeed: " + userName);
          socket.emit("join", userName, roomName, function (past) {
            past.forEach(line => draw(line));
            past.forEach(x => console.log(x));
          });
          console.log(userName + " has joined!");
          $("body").css({
            "background-image": "url(" + "/images/bkgbees.jpg" + ")",
            "background-size": "initial",
            "background-repeat": "repeat"
          });
          $(".grey-out").fadeOut(300);
          $(".game").css("visibility", "visible");
    
          //update the score board when a new player joined the game
          socket.on("newPlayer", scoreBoardDisplay);
          //delete this?
          // $(".user").fadeOut(300);
          //$('input.guess-input').focus();

        }

        else if (msg=="name already exist in room"){
          console.log(msg);
          $("#userNameErrorMsg").text("name already exist in room");
          return false;
        }

        else if (msg=="room is full"){
          $("#roomErrorMsg").text("room is full");
          return false;
        }

      })
     
    });
  }


  

  loginSucceed();

  const scoreBoardDisplay = function (results) {
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
      $scoreList.append("<p style='text-align: center;float:left'><span style='color:red'>" + "# " + rank + "&nbsp;&nbsp;&nbsp" + "</span>" + "<span style='color:blue'>" + names[i] + "</span>" + "&nbsp;&nbsp;&nbsp" + "<span style='color:red'>Total: " + totalScores[i] + "</span></p>");
      let $icon;
      if(i===0){
        $icon = $(
          "<p><img style='width = '30' height = '30'; font-weight:bold;text-align: center;float:right' src='./images/icon/" +
          playerIcons[i] +
          "' alt='player icon'>"+ "&nbsp;&nbsp"+"</img><img style='width = '30' height = '30'; font-weight:bold;text-align: center;float:right' src='./images/051-bee.png'  alt='drawer icon'></img></p>"
        );
        }else{
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

  // Chat and guess area
  $("#messagesForm").submit(function () {
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

    if(!isAMatch){
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
  });

  function dashMaker(secretWord) {
    return secretWord.replace(/[a-zA-Z]/g, "_");
  }

  let newHint = '';
  function hintMaker(word, seconds) {
    let hint = dashMaker(word);
    //console.log(hint)
    newHint = hint;
    if (seconds <= 60) {
      newHint = hint.substring(0, index1) + word[index1] + hint.substring(index1 + 1);
    } 
    if (seconds <= 30) {
      newHint = newHint.substring(0, index2) + word[index2] + newHint.substring(index2 + 1);
    } 
    if (seconds <= 10) {
      newHint = newHint.substring(0, index3) + word[index3] + newHint.substring(index3 + 1);
    }
    return newHint;
  }
  socket.on("gameStatus", function (status) {
    console.log(userName + " has joined " + status.roomName); // check if correct room is logged in with dropdown menu
    drawer = status.drawer;
    roomName = status.roomName;
    secretWord = status.secretWord;
    roundEndTime = status.roundEndTime;
    icon = status.icon;
    guessed = false;
    index1 = Math.floor(Math.random() * secretWord.length);// these make a new index each round for the hinter
    index2 = noMatch12();
    index3 = noMatch123();
    
    console.log(`here are those indexes:${index1},${index2},${index3}`)
    function noMatch12() { // the noMatch functions ensure unique letters for 5-letter words and above
      temp = Math.floor(Math.random() * secretWord.length);
      if(secretWord.length === 4){//causes only two unique letters for four letter words
        temp = index1;
      }else if (temp === index1) {
        noMatch12();
      }
      return temp;
    }
    function noMatch123() {
      temp = Math.floor(Math.random() * secretWord.length);
      if(secretWord.length === 3){// only reveals one letter for three letter words
        temp = index1;
        index2 = index1;
      }else if (temp === index1 || temp === index2) {
        noMatch123();
      }
      return temp;
    }

    $("#currentRoom").text("Room: " + roomName);

    if (drawer) {
      document.getElementById("chatSend").innerHTML = "Give up turn?";
      document.getElementById("messageInput").value =
        "I give up and cant draw this.";
      document.getElementById("messageInput").style.display = "none";
      let artButtons = document.getElementsByClassName("drawTools");
      for(let i = 0; i < artButtons.length; i++){
        artButtons[i].style.visibility = "visible";
      }
    }
    if (!drawer) {
      document.getElementById("chatSend").innerHTML = "send";
      document.getElementById("messageInput").value = "";
      document.getElementById("messageInput").style.display = "block";
      let artButtons = document.getElementsByClassName("drawTools");
      for(let i = 0; i < artButtons.length; i++){
        artButtons[i].style.visibility = "hidden";
      }
    }

    startDrawing();
    countDownTimer;
  });

  function gameTimer() {
    //console.log("end time: " + roundEndTime);
    let now = new Date().getTime();
    let distance = roundEndTime - now;
    let seconds = Math.floor(distance / 1000);

    document.getElementById("secretword").innerHTML = drawer ?
      secretWord :
      hintMaker(secretWord, seconds);
    $("#timer").html(seconds + " Seconds");

    if (distance <= 0 && drawer) {
      reason = "Time's up!";
      socket.emit("next round", roomName, reason);
    }
  }
  var countDownTimer = setInterval(gameTimer, 1000);

  socket.on("hello", function(msg) {
    $(".messages").append($("<ul>").text(msg.userName + ": " + msg.msg));

    $('.messages').scrollTop ($('.messages')[0].scrollHeight);

  });
  socket.on("correct answer", function(msg) {
    $(".messages").append(
      $("<ul>").text(msg.userName + " has the correct answer!").css('color','green')
    );
    $('.messages').scrollTop ($('.messages')[0].scrollHeight);

  });



  socket.on("playerChange", function(name, status){
    $(".messages").append(
      $("<ul>").text(name + " has " + status + " the room.").css('color','red')
    );
    $('.messages').scrollTop ($('.messages')[0].scrollHeight);
  })

  socket.on("roundResults", function(results) {

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
    console.log("REASON IS " + reasonNextRound);
    $("#timesUp").append(reasonNextRound);
    for (let i = 0; i < names.length; i++) {
      let $roundScore = $("<p style='color:red'>" + "+  " + roundScores[i] + "</p>");
      let $playerName = $("<p style='color:blue; float:left'>" + "        " + names[i] + "                        " + "</p>");
      let $playerList = $("<div style ='font-weight: bold; font-size:x-large'>");
      $("#roundResults").append($playerList);
      $playerList.append($playerName);
      $playerList.append($roundScore);
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
      $scoreList.append("<p style='text-align: center;float:left'><span style='color:red'>" + "# " + rank + "&nbsp;&nbsp;&nbsp" + "</span>" + "<span style='color:blue'>" + names[i] + "</span>" + "&nbsp;&nbsp;&nbsp" + "<span style='color:red'>Total: " + totalScores[i] + "</span></p>");
      let $icon;
      if(i===0){
        $icon = $(
          "<p><img style='width = '30' height = '30'; font-weight:bold;text-align: center;float:right' src='./images/icon/" +
          playerIcons[i] +
          "' alt='player icon'>"+ "&nbsp;&nbsp"+"</img><img style='width = '30' height = '30'; font-weight:bold;text-align: center;float:right' src='./images/051-bee.png'  alt='drawer icon'></img></p>"
        );
        }else{
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
  });

  //update the score board when guesser left the game
  socket.on("guesserLeft", scoreBoardDisplay);


  // Canvas drawing area
  let canvas = document.getElementById("drawArea");
  let ctx = canvas.getContext("2d");

  console.log(window.innerWidth);
  if (window.innerWidth >= 1300) {
    console.log("Hey I am large");
    canvas.width = 800;
    canvas.height = 600;
  } else {
    console.log("Hey I am medium");
    canvas.width = 640;
    canvas.height = 480;
  }

  let startX, startY, endX, endY;

  let mouse = {
    x: 0,
    y: 0
  };

  var startDrawing = function () {
    console.log("draw on canvas");
    canvas.onmousemove = function (e) {
      mouse.x = e.pageX - $(this).offset().left;
      mouse.y = e.pageY - $(this).offset().top;
      endX = mouse.x;
      endY = mouse.y;
    };

    /* Drawing on Paint App */
    canvas.onmousedown = function(e) {
      //   ctx.beginPath(); // delete this?
      //   ctx.moveTo(mouse.x, mouse.y);
      startX = mouse.x;
      startY = mouse.y;
      canvas.addEventListener("mousemove", onPaint, false);
    };

    canvas.onmouseup = function () {
      canvas.removeEventListener("mousemove", onPaint, false);
    };
    canvas.onmouseout = function () {
      canvas.removeEventListener("mousemove", onPaint, false);
    };

    var onPaint = function () {
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
        lineWidth: lineSize
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
  let colour = "black";
  document.getElementById("red").onclick = function () {
    colour = "red";
  };
  document.getElementById("orange").onclick = function () {
    colour = "orange";
  };
  document.getElementById("yellow").onclick = function () {
    colour = "yellow";
  };
  document.getElementById("green").onclick = function () {
    colour = "green";
  };
  document.getElementById("blue").onclick = function () {
    colour = "blue";
  };
  document.getElementById("purple").onclick = function () {
    colour = "rebeccapurple";
  };
  document.getElementById("brown").onclick = function () {
    colour = "sienna";
  };
  document.getElementById("black").onclick = function () {
    colour = "black";
  };
  document.getElementById("dimGray").onclick = function() {
    colour = "dimgray";
  };
  //second row
  document.getElementById("white").onclick = function () {
    colour = "white";
  };
  document.getElementById("pink").onclick = function () {
    colour = "pink";
  };
  document.getElementById("tomato").onclick = function () {
    colour = "tomato";
  };
  document.getElementById("goldenrod").onclick = function () {
    colour = "goldenrod";
  };
  document.getElementById("chartreuse").onclick = function () {
    colour = "chartreuse";
  };
  document.getElementById("skyblue").onclick = function () {
    colour = "skyblue";
  };
  document.getElementById("fuchsia").onclick = function () {
    colour = "fuchsia";
  };
  document.getElementById("tan").onclick = function () {
    colour = "tan";
  };
  document.getElementById("lightGray").onclick = function() {
    colour = "lightgray";
  };
  //size changing
  let lineSize = 2;
  document.getElementById("xSmaller").onclick = function () {
    lineSize = 2;
  };
  document.getElementById("small").onclick = function () {
    lineSize = 5;
  };
  document.getElementById("medium").onclick = function () {
    lineSize = 10;
  };
  document.getElementById("large").onclick = function () {
    lineSize = 20;
  };
  document.getElementById("xLarger").onclick = function () {
    lineSize = 30;
  };

  // canvas clear functions
  document.getElementById("clear").onclick = function () {
    socket.emit("clearScreen", console.log("clear screen was sent"));
  };

  function clearScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log("This screen was cleared");
  }
  socket.on("clearScreen", clearScreen);

  // canvas fill function
  document.getElementById("fill").onclick = function () {
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
  socket.on("draw", draw, originalWidth);

  function draw(line, originalWidth) {
    ctx.strokeStyle = line.strokeStyle;
    ctx.lineWidth = line.lineWidth;
    let scaleFactor = 1;
    if (canvas.width !== originalWidth) {
      if (originalWidth === 800 && canvas.width === 640) {
        scaleFactor = 0.8;
        console.log(
          `big down to small OW: ${originalWidth}, CW: ${canvas.width}`
        );
      } else if (originalWidth === 640 && canvas.width === 800) {
        scaleFactor = 1.25;
        console.log(`small up to big OW: ${originalWidth}, CW:${canvas.width}`);
      }
    }
    ctx.beginPath();
    ctx.moveTo(line.from.x * scaleFactor, line.from.y * scaleFactor);
    ctx.lineTo(line.to.x * scaleFactor, line.to.y * scaleFactor);
    ctx.closePath();
    ctx.stroke();
  }
  canvas.onmousedown = function(e) {
    //   ctx.beginPath(); // delete this?
    //   ctx.moveTo(mouse.x, mouse.y);
    startX = mouse.x;
    startY = mouse.y;

    canvas.addEventListener("mousemove", onPaint, false);
  };

  canvas.onmouseup = function () {
    canvas.removeEventListener("mousemove", onPaint, false);
  };

  var onPaint = function () {
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