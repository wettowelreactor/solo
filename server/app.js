var express = require('express');
var app = express();
var http = require('http').Server(app);
global.io = require('socket.io')(http);

io.on('connection', function(socket) {
  console.log('New client connected (id=' + socket.id + ').');
  console.log('origin: ', socket.handshake.headers.origin);
  
  socket.on('disconnect', function() {
    console.info('Client gone (id=' + socket.id + ').');
  });

  socket.on('login', function(msg) {
    if(msg.username === 'q' && msg.password === 'q') {
      if (msg.location.indexOf(socket.handshake.headers.origin) !== -1) {
        console.log('joining room: ', msg.location);
        socket.join(msg.location);
      } else {
        console.log('location/origin mismatch');
      }
    } else {
      console.log('invalid account');
    }
  });

  socket.on('InitPayload', function(msg) {
    //console.log(msg);
  });

  socket.on('mousemove', function(msg) {
    console.log(msg);
  });

  socket.on('scroll', function(msg) {
    console.log(msg);
  });
});

app.use(express.static(__dirname + '/../public'));

var port = process.env.PORT || 3000;
http.listen(port, function(){
  console.log('listening on', port);
});

