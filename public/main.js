var socket = io(); // load socket.io-client. exposes a io global, and then connect? does not specify URL, defaults to trying to connect to the host that serves the page
var userName = "guest";
var conversation = "";

// Login
function loginSucceed() {
  userName = $("#userName").val();
  $("#newUser").html("Log in succeed: " + userName);
}

// Chat and guess area
$("form").submit(function() {
  socket.emit("chat message", {
    userName: userName,
    msg: $("#m").val()
  });

  if ($("#m").val() === "banana") {
    socket.emit("correct answer", {
      userName: userName
    });
  }
  $("#m").val("");
  return false;
});
socket.on("hello", function(msg) {
  $("#messages").append($("<li>").text(msg.userName + ": " + msg.msg));
  window.scrollTo(0, -document.body.scrollHeight);
});
socket.on("correct answer", function(msg) {
  $("#messages").append(
    $("<li>").text(msg.userName + " has the correct answer!")
  );
  window.scrollTo(0, -document.body.scrollHeight);
});

// Canvas drawing area
var canvas = document.getElementById("paint");
var ctx = canvas.getContext("2d");

var sketch = document.getElementById("sketch");
var sketch_style = getComputedStyle(sketch);
var canDraw = true; // prevent user from drawing when false
canvas.width = 500;
canvas.height = 250;
var startX, startY, endX, endY;

var mouse = { x: 0, y: 0 };

/* Mouse Capturing Work */
canvas.onmousemove = function(e) {
  mouse.x = e.pageX - this.offsetLeft;
  mouse.y = e.pageY - this.offsetTop;
  endX = mouse.x;
  endY = mouse.y;
};

/* Drawing on Paint App */
ctx.lineJoin = "round";
ctx.lineCap = "round";

ctx.strokeStyle = canDraw ? "red" : "transparent";
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

function getColor(colour) {
  if (canDraw) ctx.strokeStyle = colour;
  else ctx.strokeStyle = "transparent";
}

function getSize(size) {
  ctx.lineWidth = size;
}
function clearCanvas() {
  ctx.clearRect(0, 0, 500, 250);
}
//ctx.strokeStyle =
//ctx.strokeStyle = document.settings.colour[1].value;

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
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  var line = {
    from: { x: startX, y: startY },
    to: { x: endX, y: endY },
    strokeStyle: ctx.strokeStyle,
    lineWidth: ctx.lineWidth
  };
  socket.emit("draw", line);
  startX = endX;
  startY = endY;
};

// check input and determine if it's the correct answer
function checkAnswer() {
  if (document.getElementById("answer").value == "banana")
    document.getElementById("result").innerHTML = "Correct";
}

// disable buttons when it's not user's turn to draw
function disableDrawing() {
  var buttons = document.getElementsByClassName("painting");
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].setAttribute("disabled", "disabled");
  }
}

// original Canvas implementation
// var canvas = $('#paint'),
// 		// clearcanvas = $('#clearcanvas'),
// 		// clearchat = $('#clearchat'),
// 		selectedcolor = "black",
// 		context = canvas.getContext('2d'),
// 		lastpoint = null,
// 		painting = false;
// 		myturn = true;

// 	// socket.on('draw', draw);

// 	function draw(line) {
// 		context.lineJoin = 'round';
// 		context.lineWidth = 2;
// 		context.strokeStyle = line.color;
// 		context.beginPath();

// 		if(line.from) {
// 			context.moveTo(line.from.x, line.from.y);
// 		}else{
// 			context.moveTo(line.to.x-1, line.to.y);
// 		}

// 		context.lineTo(line.to.x, line.to.y);
// 		context.closePath();
// 		context.stroke();
// 	}

// 	// Disable text selection on the canvas
// 	canvas.mousedown(function () {
// 		return false;
// 	});

// 	canvas.mousedown(function(e) {
// 		if(myturn) {
// 			painting = true;
// 			var newpoint = { x: e.pageX - this.offsetLeft, y: e.pageY - this.offsetTop},
// 				line = { from: null, to: newpoint, color: selectedcolor };

// 			draw(line);
// 			lastpoint = newpoint;
// 			// socket.emit('draw', line);
// 		}
// 	});

// 	canvas.mousemove(function(e) {
// 		if(myturn && painting) {
// 			var newpoint = { x: e.pageX - this.offsetLeft, y: e.pageY - this.offsetTop},
// 				line = { from: lastpoint, to: newpoint, color: selectedcolor };

// 			draw(line);
// 			lastpoint = newpoint;
// 			// socket.emit('draw', line);
// 		}
// 	});

// 	canvas.mouseout(function(e) {
// 		painting = false;
// 	});

// 	canvas.mouseup(function(e) {
// 		painting = false;
// 	});

// socket.on('drawCanvas', function(canvasToDraw) {
// 	if(canvasToDraw) {
// 		canvas.width(canvas.width());
// 		context.lineJoin = 'round';
// 		context.lineWidth = 2;

// 		for(var i=0; i < canvasToDraw.length; i++)
// 		{
// 			var line = canvasToDraw[i];
// 			context.strokeStyle = line.color;
// 			context.beginPath();
// 			if(line.from){
// 				context.moveTo(line.from.x, line.from.y);
// 			}else{
// 				context.moveTo(line.to.x-1, line.to.y);
// 			}
// 			context.lineTo(line.to.x, line.to.y);
// 			context.closePath();
// 			context.stroke();
// 		}
// 	}
// });

// clearcanvas.click(function() {
// 	if(myturn) {
// 		socket.emit('clearCanvas');
// 	}
// });

// socket.on('clearCanvas', function() {
// 	context.clearRect ( 0 , 0 , canvas.width() , canvas.height() );
// });

// clearchat.click(function() {
// 	chatcontent.text('');
// 	chatinput.val('');
// 	chatinput.focus();
// });
