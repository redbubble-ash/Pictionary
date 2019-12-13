$(document).ready(function() {
  let socket = io(); // load socket.io-client. exposes a io global, and then connect? does not specify URL, defaults to trying to connect to the host that serves the page
  let userName;
  let conversation = "";
  let drawer;
  let secretWord;
  let roomName;
  let guessed = false;
  let icon;

  // Login
  function loginSucceed() {
    // $(".game").toggle();
    $(".grey-out").fadeIn(500);

    $('#room').on('change', function() {
      if(this.value==='custom'){
        $("#roomName").css('visibility','visible');
      }
      else{
        $("#roomName").css('visibility','hidden');
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

      // if (userName == "") {
      //     return false
      // };

      // var index = users.indexOf(user);

      // if (index > -1) {
      //     alert(user + ' already exists');
      //     return false
      // };

      $("#newUser").html("Log in succeed: " + userName);
      socket.emit("join", userName, roomName, function(past) {
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
      // $(".user").fadeOut(300);
      //$('input.guess-input').focus();
    });
  }

  loginSucceed();

  // Chat and guess area
  $("#messagesForm").submit(function() {
    if (drawer) {
      socket.emit("next round", roomName);
    }

    socket.emit("chat message", {
      roomName: roomName,
      userName: userName,
      msg: $("#messageInput").val()
    });
    let isAMatch = false;
    let toBeEval = $("#messageInput").val(); // sets input to a nicer variable
    if (toBeEval.toLowerCase().search(secretWord) >= 0) {
      // makes the whole string lowercase and searches for the correct string, search returns index -1 if not found
      isAMatch = true;
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

  let newHint = "";
  function hintMaker(word, seconds) {
    let hint = dashMaker(word);
    const index1 = Math.floor(Math.random() * hint.length);
    const index2 = noMatch12();
    const index3 = noMatch123();

    function noMatch12() {
      temp = Math.floor(Math.random() * hint.length);
      if (temp === index1) {
        noMatch12();
      }
      return temp;
    }
    function noMatch123() {
      temp = Math.floor(Math.random() * hint.length);
      if (temp === index1 || temp === index2) {
        noMatch123();
      }
      return temp;
    }

    if (seconds > 60) {
      newHint = hint;
    } else if (seconds === 60) {
      newHint =
        hint.substring(0, index1) + word[index1] + hint.substring(index1 + 1);
    } else if (seconds === 30 && word.length > 4) {
      newHint =
        newHint.substring(0, index2) +
        word[index2] +
        newHint.substring(index2 + 1);
    } else if (seconds === 10 && word.length > 3) {
      newHint =
        newHint.substring(0, index3) +
        word[index3] +
        newHint.substring(index3 + 1);
    }
    return newHint;
  }
  socket.on("gameStatus", function(status) {
    console.log(userName + " has joined " + status.roomName); // check if correct room is logged in with dropdown menu
    drawer = status.drawer;
    roomName = status.roomName;
    secretWord = status.secretWord;
    roundEndTime = status.roundEndTime;
    icon = status.icon;
    guessed = false;

    
    if(drawer){ 
    document.getElementById("chatSend").innerHTML = "Give up turn?";
    document.getElementById("messageInput").value = "I give up and cant draw this."
    document.getElementById("messageInput").style.display = "none";

    }
    if (!drawer) {
      document.getElementById("chatSend").innerHTML = "send";
      document.getElementById("messageInput").value = "";
      document.getElementById("messageInput").style.display = "block";
    }

    startDrawing();
    countDownTimer;
  });

  function gameTimer() {
    //console.log("end time: " + roundEndTime);
    let now = new Date().getTime();
    let distance = roundEndTime - now;
    let seconds = Math.floor(distance / 1000);

    document.getElementById("secretword").innerHTML = drawer
      ? secretWord
      : hintMaker(secretWord, seconds);
    $("#timer").html(seconds + " Seconds");

    if (distance <= 0 && drawer) {
      socket.emit("next round", roomName);
    }
  }
  var countDownTimer = setInterval(gameTimer, 1000);

  socket.on("hello", function(msg) {
    $("#messages").append($("<li>").text(msg.userName + ": " + msg.msg));
    window.scrollTo(0, -document.body.scrollHeight);
  });
  socket.on("correct answer", function(msg) {
    $("#messages").append(
      $("<li>").text(msg.userName + " has the correct answer!")
    );
    window.scrollTo(0, -document.body.scrollHeight);
    // socket.emit("take turns");
  });

  socket.on("roundResults", function(results) {
    $("#timer").hide();
    let names = results.userNames;
    let roundScores = results.roundScores;
    let totalScores = results.totalScores;

    $("#roundResults").empty();
    $("#secretWord").empty();
    $("#timesUp").empty();
    $("#roundresults").empty();

    $(".hover_bkgr_fricc").show();
    $("#secretWord").append("The word was " + secretWord);
    $("#timesUp").append("Time is up");
    for (let i = 0; i < names.length; i++) {
      $("#roundResults").append(
        $("<li>").text(
          names[i] + " round: " + roundScores[i] + ", total: " + totalScores[i]
        )
      );
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

    console.log("scores: " + scores);
    for (let i = 0; i < names.length; i++) {
      function findScore(score) {
        return score === totalScores[i];
      }
      let rank = scores.findIndex(findScore);
      rank++;
      //console.log("Player: "+names[i]+"RANK "+rank)
      let $name = $("<p style='text-align: center'>" + names[i] + "</p>");
      let $nameScore = $name.append(
        $(
          "<p style='text-align: center'>" +
            " Total: " +
            totalScores[i] +
            "</p>"
        )
      );
      let $scoreList = $("<div>");
      $scoreList.append(
        "<strong style='float:left; font-size:large;text-align: center'>" +
          "# " +
          rank +
          "</strong>"
      );
      $scoreList.append($nameScore);
      $("#roundresults").append($scoreList);
    }
  });

  // Canvas drawing area
  let canvas = document.getElementById("drawArea");
  let ctx = canvas.getContext("2d");
  /* consider for deletion
  //var sketch = document.getElementById("sketch");
  //var sketch_style = getComputedStyle(sketch);
  //var canDraw = true; // prevent user from drawing when false
*/
  canvas.width = document.getElementById("sketch").offsetWidth; // controls responsive resizing of drawing canvas, width
  canvas.height = document.getElementById("sketch").offsetHeight; 
  // canvas.style.width = "800px";
  // canvas.style.height = "600px";
  let startX, startY, endX, endY;

  let mouse = {
    x: 0,
    y: 0
  };

  var startDrawing = function() {
    console.log("draw on canvas");
    canvas.onmousemove = function(e) {
      mouse.x = e.pageX - $(this).offset().left;
      mouse.y = e.pageY - $(this).offset().top;
      endX = mouse.x;
      endY = mouse.y;
    };

    /* Drawing on Paint App */
    canvas.onmousedown = function(e) {
      //   ctx.beginPath();
      //   ctx.moveTo(mouse.x, mouse.y);
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
        lineWidth: lineSize
      };
      if (drawer) {
        socket.emit("draw", line);
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
  let colour = "white";
  document.getElementById("red").onclick = function() {
    colour = "red";
  };
  document.getElementById("orange").onclick = function() {
    colour = "orange";
  };
  document.getElementById("yellow").onclick = function() {
    colour = "yellow";
  };
  document.getElementById("green").onclick = function() {
    colour = "green";
  };
  document.getElementById("blue").onclick = function() {
    colour = "blue";
  };
  document.getElementById("purple").onclick = function() {
    colour = "rebeccapurple";
  };
  document.getElementById("brown").onclick = function() {
    colour = "sienna";
  };
  document.getElementById("black").onclick = function() {
    colour = "black";
  };
  document.getElementById("white").onclick = function() {
    colour = "white";
  };

  //size changing
  let lineSize = 2;
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
    socket.emit("clearScreen", console.log("clear screen was sent"));
  };

  function clearScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log("This screen was cleared");
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
    ctx.beginPath();
    ctx.moveTo(line.from.x, line.from.y);
    ctx.lineTo(line.to.x, line.to.y);
    ctx.closePath();
    ctx.stroke();
  }
  canvas.onmousedown = function(e) {
    //   ctx.beginPath();
    //   ctx.moveTo(mouse.x, mouse.y);
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
