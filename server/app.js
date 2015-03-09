var express = require('express');
var app = express();
var http = require('http').Server(app);
global.io = require('socket.io')(http);

io.on('connection', function(socket){
  console.log('New client connected (id=' + socket.id + ').');
  socket.on('disconnect', function(){
    console.info('Client gone (id=' + socket.id + ').');
  });
});

var port = process.env.PORT || 3000;
http.listen(port, function(){
  console.log('listening on', port);
});
