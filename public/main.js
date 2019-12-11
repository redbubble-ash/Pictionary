$(document).ready(function() {
  let socket = io(); // load socket.io-client. exposes a io global, and then connect? does not specify URL, defaults to trying to connect to the host that serves the page
  let userName;
  let conversation = "";
  let drawer;
  let secretWord;
  let roomName;
  let guessed = false;

  // let roundStartTime;
  // let roundEndTime;
  // let count;
  // let counter;

  // Login
  function loginSucceed() {
    $(".grey-out").fadeIn(500);
    $(".user").fadeIn(500);
    $(".user").submit(function() {
      event.preventDefault();
      userName = $("#userName")
        .val()
        .trim();
      let roomName = $("#roomName")
        .val()
        .trim();
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
        console.log(past);
      });
      console.log(userName + " has joined!");
      $(".grey-out").fadeOut(300);
      $(".user").fadeOut(300);
      //$('input.guess-input').focus();
    });
  }

  loginSucceed();

  var users = [];
  //socket.on('userlist', userlist);

  // function timer() {
  //     count = count - 1;
  //     console.log("remainting time: " + count);
  //     if (count === 0) {
  //         socket.emit("next round");
  //         $("#timeOut").html("Out of time! &#128543;");
  //     } else if (count < 0) {
  //         clearInterval(counter);
  //         return;
  //     }
  //     // if (count < 0) {
  //     //     clearInterval(counter);
  //     //     $("#timeOut").html("Out of time! &#128543;");
  //     //     return;
  //     // }

  //     socket.emit('timer', count );
  //     $("#timer").html("Time Remaining: " + count + " Seconds")
  // }

  // Chat and guess area
  $("#messagesForm").submit(function() {
    socket.emit("chat message", {
      roomName: roomName,
      userName: userName,
      msg: $("#m").val()
    });

    if ($("#m").val() === secretWord && !guessed) {
      guessed = true;
      socket.emit("correct answer", {
        userName: userName,
        roundScore: 50
      });
    }
    $("#m").val("");
    return false;
  });


  socket.on("gameStatus", function(status) {
    drawer = status.drawer;
    roomName = status.roomName;
    secretWord = status.secretWord;
    roundEndTime = status.roundEndTime;

    // enable/disable guess word
    document.getElementById("secretword").innerHTML = drawer
      ? secretWord
      : "_____";

    startDrawing();
    countDownTimer;
  });

  function gameTimer() {
    console.log("end time: " + roundEndTime);
    let now = new Date().getTime();
    let distance = roundEndTime - now;
    let seconds = Math.floor(distance / 1000);

    $("#timer").html("Time Remaining: " + seconds + " Seconds");

    if (distance <= 0 && drawer) {
      socket.emit("next round",roomName);
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

    $("#roundresults").empty();
    $("#secretWord").empty();
    $("#timesUp").empty();

    // popUp window to display score board
    $(".hover_bkgr_fricc").show();
    //$("#scoreBoard").fadeIn("slow");
    $("#secretWord").append("The word was " + secretWord);
    $("#timesUp").append("Time is up");
    for (let i = 0; i < names.length; i++) {
      $("#roundresults").append(
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
  });

  // Canvas drawing area
  let canvas = document.getElementById("drawArea");
  let ctx = canvas.getContext("2d");
  /* consider for deletion
  //var sketch = document.getElementById("sketch");
  //var sketch_style = getComputedStyle(sketch);
  //var canDraw = true; // prevent user from drawing when false
*/
  canvas.width = window.innerWidth * 0.63; // controls responsive resizing of drawing canvas, width
  canvas.height = window.innerHeight * 0.8;
  let startX, startY, endX, endY;

  let mouse = {
    x: 0,
    y: 0
  };

  var startDrawing = function() {
    console.log("draw on canvas");
    canvas.onmousemove = function(e) {
      mouse.x = e.pageX - this.offsetLeft;
      mouse.y = e.pageY - this.offsetTop;
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

    var onPaint = function() {
      //   ctx.lineTo(mouse.x, mouse.y);
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

  // disableDrawing();
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

  //ctx.strokeStyle = canDraw ? console.log(colour) : "transparent";
  disableDrawing();
  socket.on("draw", draw);

  /* consider chunk below for deletion
    // function getColor(colour) {
        //     if (canDraw) ctx.strokeStyle = colour;
        //     else ctx.strokeStyle = "transparent";
        // }
        
        // function getSize(size) {
            //     ctx.lineWidth = size;
            // }
            
            // function clearCanvas() {
                //     ctx.clearRect(0, 0, 500, 250);
                // }
                //ctx.strokeStyle =
                //ctx.strokeStyle = document.settings.colour[1].value;
    */
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
    //   ctx.lineTo(mouse.x, mouse.y);
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

  // check input and determine if it's the correct answer
  function checkAnswer() {
    if (document.getElementById("answer").value == secretWord)
      document.getElementById("result").innerHTML = "Correct";
  }

  // disable buttons when it's not user's turn to draw
  function disableDrawing() {
    var buttons = document.getElementsByClassName("painting");
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("disabled", "disabled");
    }
  }
});
