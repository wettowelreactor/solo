var io = require('./socket.io.client.js');
var d3 = require('./d3.min.js');

var socket = io('http://localhost:3000');

socket.emit('InitPayload', {
  screen: {
    availHeight: window.screen.availHeight,
    availLeft: window.screen.availLeft,
    availTop: window.screen.availTop,
    availWidth: window.screen.availWidth,
    colorDepth: window.screen.colorDepth,
    height: window.screen.height,
    orientation: {
      angle: window.screen.orientation.angle,
      type: window.screen.orientation.type
    },
    pixelDepth: window.screen.pixelDepth,
    width: window.screen.width
  }
  //navigator: window.navigator,
  //location: window.location,
  //referrer: window.referrer
});



//Window pageXOffset and pageYOffset

//mousemove event listener




