var express = require('express');
var app = express();
var http = require('http').Server(app);
global.io = require('socket.io')(http);
var numAdmins = 0;
var numClients = 0;

io.on('connection', function(socket) {
  console.log('New client connected (id=' + socket.id + ').');
  numClients += 1;

  //todo kill client cursor on disconnect
  socket.on('disconnect', function() {
    socket.OTSADMIN && (numAdmins -= 1);
    numClients -= 1;
    console.info('Client gone (id=' + socket.id + ').');
    io.to(socket.handshake.headers.origin).emit('clientGone', {
      client: socket.id}
    );
  });

  socket.on('login', function(msg) {
    var origin = socket.handshake.headers.origin;
    if(msg.username === 'q' && msg.password === 'q') {
      if (msg.location.indexOf(origin) !== -1) {
        console.log('joining rooms: ', msg.location, origin);
        socket.join(msg.location);
        socket.join(origin);
        socket.OTSADMIN = true;
        numAdmins += 1;
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
    if (msg.location.indexOf(socket.handshake.headers.origin) !== -1) {
      !socket.OTSADMIN && io.to(msg.location).emit('clientMouseMove', msg);
    } else {
      console.log('location/origin mismatch');
    }
  });

  socket.on('scroll', function(msg) {
    if (msg.location.indexOf(socket.handshake.headers.origin) !== -1) {
      !socket.OTSADMIN && io.to(msg.location).emit('clientScroll', msg);
    } else {
      console.log('location/origin mismatch');
    }
  });
});

app.use(express.static(__dirname + '/../public'));

var port = process.env.PORT || 3000;
http.listen(port, function(){
  console.log('listening on', port);
});

