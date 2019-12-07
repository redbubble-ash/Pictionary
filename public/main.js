let socket = io(); // load socket.io-client. exposes a io global, and then connect? does not specify URL, defaults to trying to connect to the host that serves the page
let userName;
let conversation = "";

// Login
function loginSucceed() {
    $(".grey-out").fadeIn(500);
    $(".user").fadeIn(500);
    $(".user").submit(function () {
        event.preventDefault();
        userName = $("#userName").val().trim();
        // if (userName == "") {
        //     return false
        // };

        // var index = users.indexOf(user);

        // if (index > -1) {
        //     alert(user + ' already exists');
        //     return false
        // };

        $("#newUser").html("Log in succeed: " + userName);
        socket.emit('join', userName);
        console.log(userName + " has joined!");
        $(".grey-out").fadeOut(300);
        $(".user").fadeOut(300);
        //$('input.guess-input').focus();


    });
}

$(document).ready(function () {
    loginSucceed();
    var users = [];
    //socket.on('userlist', userlist);

    // Chat and guess area
    $("#messagesForm").submit(function () {
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
    socket.on("hello", function (msg) {
        $("#messages").append($("<li>").text(msg.userName + ": " + msg.msg));
        window.scrollTo(0, -document.body.scrollHeight);
    });
    socket.on("correct answer", function (msg) {
        $("#messages").append(
            $("<li>").text(msg.userName + " has the correct answer!")
        );
        window.scrollTo(0, -document.body.scrollHeight);
    });

    // Canvas drawing area
    var canvas = document.getElementById("drawArea");
    var ctx = canvas.getContext("2d");

    var sketch = document.getElementById("sketch");
    var sketch_style = getComputedStyle(sketch);
    var canDraw = true; // prevent user from drawing when false
    canvas.width = window.innerWidth *  .5; // controls responsive resizing of drawing canvas, width
    canvas.height = window.innerHeight * .8;
    var startX, startY, endX, endY;

    var mouse = {
        x: 0,
        y: 0
    };

    /* Mouse Capturing Work */
    canvas.onmousemove = function (e) {
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

    canvas.onmousedown = function (e) {
        //   ctx.beginPath();
        //   ctx.moveTo(mouse.x, mouse.y);
        startX = mouse.x;
        startY = mouse.y;

        canvas.addEventListener("mousemove", onPaint, false);
    };

    canvas.onmouseup = function () {
        canvas.removeEventListener("mousemove", onPaint, false);
    };

    var onPaint = function () {
        //   ctx.lineTo(mouse.x, mouse.y);
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

})

