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

window.addEventListener('load', function() { 
  window.addEventListener('scroll', function(){
    throttledScroll();
  });
  window.addEventListener('mousemove', function(event){
    throttledMouse(event);
  });
}, false);

throttle = function(func, limit, context) {
  var then = Date.now();
  return function(){
    var now = Date.now();
    if (!then || now - then >= limit) {
      then = now;
      func.apply(context, arguments);
    }
  };
};

throttledMouse = throttle(function(event){
  console.log('mousemove', event.pageX, event.pageY);
}, 1000);

throttledScroll = throttle(function(){
  console.log('scroll', window.pageXOffset, window.pageYOffset);
}, 1000);

//Window pageXOffset and pageYOffset

//mousemove event listener




