var express = require("express");
var app = express();
var path = require("path");
var server = require("http").Server(app);
var io = require("socket.io")(server); // initialize a new instance of socket.io by passing the http server object
var port = 3000;

server.listen(port, () => {
  console.log("Server listening at port %d", port);
});

// Routing, serve html
app.use(express.static(path.join(__dirname, "public")));
// app.get('/',function(req,res){
//     res.sendFile(path.join(__dirname,'public','index.html'));
// })

// io.on('connection',function(socket){
//     console.log('new connection made(console).');
//     // emit has to send an object
//     socket.emit('msg-from-server',{
//         greeting: 'hello from server'
//     });

//     socket.on('msg-from-client',(msg)=>{
//         console.log(msg.greeting);
//     })
io.on("connection", function(socket) {
  socket.on("chat message", function(msg) {
    io.emit("hello", msg);
  });

  socket.on("correct answer", function(msg){
      io.emit("correct answer", msg)
  })

  socket.on('draw', function(line){
      socket.broadcast.emit('draw',line);
  })
});
