//document.getElementsByTagName('body')[0].clientHeight

var io = require('./socket.io.client.js');
var d3 = require('./d3.min.js');
var heat = require('./heatmap.min.js').h337;

var clients = {};
var mapwrapper;
var mapDiv;
var clickmap;
var movemap;
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
  },
  navigator: {
    appCodeName: window.navigator.appCodeName,
    appName: window.navigator.appName,
    appVersion: window.navigator.appVersion,
    cookieEnabled: window.navigator.cookieEnabled,
    doNotTrack: window.navigator.doNotTrack,
    hardwareConcurrency: window.navigator.hardwareConcurrency,
    language: window.navigator.language,
    languages: window.navigator.languages,
    maxTouchPoints: window.navigator.maxTouchPoints,
    onLine: window.navigator.onLine,
    platform: window.navigator.platform,
    product: window.navigator.product,
    productSub: window.navigator.productSub,
    userAgent: window.navigator.userAgent,
    vendor: window.navigator.vendor,
    vendorSub: window.navigator.vendorSub
  },
  location: window.location.href,
  referrer: document.referrer
});

var project = function(orignPoint, originScale, destinationScale) {
  return (orignPoint * destinationScale) / originScale;
};

socket.on('clientMouseMove', function(msg) {
  var width = document.getElementsByTagName('body')[0].clientWidth;
  var height = document.getElementsByTagName('body')[0].clientHeight;
  var projectedX = project(msg.x, msg.width, width);
  var projectedY = project(msg.y, msg.height, height);
  var projectedXOffset = project(msg.xOffset, msg.width, width);
  var projectedYOffset = project(msg.yOffset, msg.height, height);
  clients[msg.id] || (clients[msg.id] = {id: msg.id});
  clients[msg.id].x = projectedX;
  clients[msg.id].y = projectedY;
console.log(projectedX - projectedXOffset, projectedY - projectedYOffset);
  if (movemap) {
    movemap.addData({
      x: projectedX - window.pageXOffset, //projectedXOffset,
      y: projectedY - window.pageYOffset, //projectedYOffset,
      value: 1
    });
  }
});

socket.on('clientScroll', function(msg) {
  var width = document.getElementsByTagName('body')[0].clientWidth;
  var height = document.getElementsByTagName('body')[0].clientHeight;
  clients[msg.id] || (clients[msg.id] = {id: msg.id});
  clients[msg.id].xOffset = project(msg.xOffset, msg.width, width);
  clients[msg.id].yOffset = project(msg.yOffset, msg.width, width);
});

socket.on('clientGone', function(msg) {
  clientLeave(msg.id);
});

socket.on('clientClick', function(msg) {
  clientClick(msg.id);
});

socket.on('clientSync', function(realClients) {
  currentClients = Object.keys(clients);
  currentClients.forEach(function(client) {
    if (realClients.indexOf(client) === -1) {
      clientLeave(client);
    }
  });
});

socket.on('loggedIn', function() {
  setInterval(updateTick, 250);
});

var throttle = function(func, limit, context) {
  var then = Date.now();
  return function(){
    var now = Date.now();
    if (!then || now - then >= limit) {
      then = now;
      func.apply(context, arguments);
    }
  };
};

var throttledMouse = throttle(function(event){
  socket.emit('mousemove', {
    location: window.location.href,
    id: socket.id,
    x: event.pageX, 
    y: event.pageY,
    xOffset: window.pageXOffset,
    yOffset: window.pageYOffset,
    width: document.getElementsByTagName('body')[0].clientWidth,
    height: document.getElementsByTagName('body')[0].clientHeight
  });
}, 17);

var throttledScroll = throttle(function(){
  updateClientPins();
  genHeatMap();
  socket.emit('scroll', {
    location: window.location.href,
    id: socket.id,
    xOffset: window.pageXOffset, 
    yOffset: window.pageYOffset,
    width: document.getElementsByTagName('body')[0].clientWidth,
    height: document.getElementsByTagName('body')[0].clientHeight
  });
}, 17);

var throttledClick = throttle(function(){
  socket.emit('click', {
    location: window.location.href,
    id: socket.id,
    x: event.pageX, 
    y: event.pageY,
    width: document.getElementsByTagName('body')[0].clientWidth,
    height: document.getElementsByTagName('body')[0].clientHeight
  });
}, 17);

var throttledClientSync = throttle(function(){
  socket.emit('requestClientSync', {location: window.location.href});
}, 5000);

window.login = function(){
  socket.emit('login', {
    username: 'q',
    password: 'q',
    location: window.location.href
  });
};

var clientLeave = function(clientID) {
  if (clients[clientID]) {
    clients[clientID].dead = true;
    setTimeout(function() {
      if (clients[clientID]) {
        delete clients[clientID];
      }
    }, 5000);
  }
};

var clientClick = function(clientID) {
  clients[clientID].click = true;
  setTimeout(function() {
    clients[clientID].click = false;
  }, 500);
};

var updateClientCursors = function() {
  var cursors = d3.select('body').selectAll('.clientCursor')
    .data(
      Object.keys(clients).map(function (key) {return clients[key];}), 
      function(d) {return d.id;}
    );

  cursors.enter()
    .append('div')
    .attr('class', 'clientCursor');

  cursors.classed('glowLeave', function(d){return d.dead;})
    .classed('glowClick', function(d){return d.click;})
    .transition()
    .duration(200)
    .style({
      top: function(d){return d.y + 'px';},
      left: function(d){return d.x + 'px';}
    });

  cursors.exit()
    .remove();
};

var updateClientPins = function() {
  var pins = d3.select('body').selectAll('.clientPin')
    .data(
      Object.keys(clients).map(function (key) {return clients[key];}), 
      function(d) {return d.id;}
    );

  pins.enter()
    .append('div')
    .attr('class', 'clientPin');

  pins.style({
    top: function(d){return getPinTopPosition(d.y);},
    left: function(d){return getPinLeftPosition(d.x);},
    '-webkit-transform': function(d){return getPinRotation(d.x, d.y);},
    '-ms-transform': function(d){return getPinRotation(d.x, d.y);},
    'transform': function(d){return getPinRotation(d.x, d.y);},
  });

  pins.exit()
    .remove();
};

var getPinTopPosition = function(y) {
  if (y < window.pageYOffset) {
    return window.pageYOffset + 'px';
  } else if (y > window.pageYOffset + window.innerHeight) {
    return (window.pageYOffset + window.innerHeight - 44) + 'px';
  } else {
    return '-1000px';
  }
};

var getPinLeftPosition = function(x) {
  if (x < window.pageXOffset) {
    return window.pageXOffset + 'px';
  } else if (x > window.pageXOffset + window.innerWidth) {
    return (window.pageXOffset + window.innerWidth - 44) + 'px';
  } else {
    return x + 'px';
  }
};

var getPinRotation = function(x, y) {
  var rotation = 0;
  if (y < window.pageYOffset) {
    rotation = 180;
  }
  if (x < window.pageXOffset) {
    if (rotation === 180) {
      rotation -= 90;
    } else {
      rotation += 90;
    }
  } else if (x > window.pageXOffset + window.innerWidth) {
    if (rotation === 180) {
      rotation += 90;
    } else {
      rotation -= 90;
    }
  }
  return 'rotateZ(' + rotation + 'deg)';
};

var updateTick = function() {
  updateClientCursors();
  updateClientPins();
  throttledClientSync();
};

var addCSSRule = function(sheet, selector, rules, index) {
  if("insertRule" in sheet) {
    sheet.insertRule(selector + "{" + rules + "}", index);
  }
  else if("addRule" in sheet) {
    sheet.addRule(selector, rules, index);
  }
};

var genHeatMap = function(){
  console.log('moving');
  mapwrapper.style.left = window.pageXOffset + 'px';
  mapwrapper.style.top = window.pageYOffset + 'px';
  //mapDiv.style.left = window.pageXOffset + 'px';
  //mapDiv.style.top = window.pageYOffset + 'px';
  var existingMaps = document.querySelector('.heatmap-canvas');
  if(existingMaps) {
    existingMaps.remove();
  }
  movemap = heat.create({
    container: mapDiv,
    radius: 16
  });
};

window.addEventListener('load', function() { 
  window.addEventListener('scroll', function(){
    throttledScroll();
  });
  window.addEventListener('mousemove', function(event) {
    throttledMouse(event);
  });
  window.addEventListener('click', function(){
    throttledClick();
  });

  mapwrapper = document.createElement('div');
  mapDiv = document.createElement('div');
  mapwrapper.style.width = window.innerWidth + 'px';
  mapwrapper.style.height = window.innerHeight + 'px';
  mapwrapper.style.position = 'absolute';
  mapwrapper.style.left = '0px';
  mapwrapper.style.top = '0px';
  mapwrapper.style.zIndex = '4500';
  mapDiv.style.width = window.innerWidth + 'px';
  mapDiv.style.height = window.innerHeight + 'px';
  mapDiv.style.position = 'absolute';
  mapDiv.style.left = '0px';
  mapDiv.style.top = '0px';
  mapwrapper.appendChild(mapDiv);
  document.body.appendChild(mapwrapper);

  genHeatMap();

  document.styleSheets[0].insertRule(
    '.clientCursor {' +
      'width: 64px;' +
      'height: 64px;' +
      'position: absolute;' +
      'z-index: 5000;' +
      'background-repeat: no-repeat;' +
      'background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAABCRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDUuNC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIgogICAgICAgICAgICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgICAgICAgICAgIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyI+CiAgICAgICAgIDx0aWZmOlJlc29sdXRpb25Vbml0PjI8L3RpZmY6UmVzb2x1dGlvblVuaXQ+CiAgICAgICAgIDx0aWZmOkNvbXByZXNzaW9uPjU8L3RpZmY6Q29tcHJlc3Npb24+CiAgICAgICAgIDx0aWZmOlhSZXNvbHV0aW9uPjcyPC90aWZmOlhSZXNvbHV0aW9uPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8dGlmZjpZUmVzb2x1dGlvbj43MjwvdGlmZjpZUmVzb2x1dGlvbj4KICAgICAgICAgPGV4aWY6UGl4ZWxYRGltZW5zaW9uPjY0PC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgICAgPGV4aWY6Q29sb3JTcGFjZT4xPC9leGlmOkNvbG9yU3BhY2U+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj42NDwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgICAg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);' +
      '-webkit-transform: scale(.5);' +
      '-ms-transform: scale(.5);' +
      'transform: scale(.5);' +
    '}', 0
  );
  document.styleSheets[0].insertRule(
    '.clientPin {' +
      'width: 32px;' +
      'height: 44px;' +
      'position: absolute;' +
      'z-index: 5000;' +
      'background-repeat: no-repeat;' +
      'background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAsCAYAAAAEuLqPAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAABCRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDUuNC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIgogICAgICAgICAgICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgICAgICAgICAgIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyI+CiAgICAgICAgIDx0aWZmOlJlc29sdXRpb25Vbml0PjI8L3RpZmY6UmVzb2x1dGlvblVuaXQ+CiAgICAgICAgIDx0aWZmOkNvbXByZXNzaW9uPjU8L3RpZmY6Q29tcHJlc3Npb24+CiAgICAgICAgIDx0aWZmOlhSZXNvbHV0aW9uPjcyPC90aWZmOlhSZXNvbHV0aW9uPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8dGlmZjpZUmVzb2x1dGlvbj43MjwvdGlmZjpZUmVzb2x1dGlvbj4KICAgICAgICAgPGV4aWY6UGl4ZWxYRGltZW5zaW9uPjMyPC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgICAgPGV4aWY6Q29sb3JTcGFjZT4xPC9leGlmOkNvbG9yU3BhY2U+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj40NDwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgICAg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);' +
    '}', 0
  );
  document.styleSheets[0].insertRule(
    '.glowClick {' +
      'box-shadow: 0px 0px 32px #ff0;' +
    '}', 0
  );
  document.styleSheets[0].insertRule(
    '.glowLeave {' +
      'box-shadow: 0px 0px 32px #f00;' +
    '}', 0
  );
}, false);
