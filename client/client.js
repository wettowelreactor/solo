var io = require('./socket.io.client.js');
var d3 = require('./d3.min.js');

var clients = {};
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


socket.on('clientMouseMove', function(msg) {
  console.log('cmm: ', msg);
  clients[msg.id] || (clients[msg.id] = {id: msg.id});
  clients[msg.id].x = msg.x;
  clients[msg.id].y = msg.y;
});

socket.on('clientScroll', function(msg) {
  console.log('cs: ', msg);
  clients[msg.id] || (clients[msg.id] = {id: msg.id});
  clients[msg.id].xOffset = msg.xOffset;
  clients[msg.id].yOffset = msg.yOffset;
});

socket.on('clientGone', function(msg) {
  console.log('clientGone', msg);
  delete clients[msg.id];
});

socket.on('clientSync', function(realClients) {
  console.log('clientSync', msg);
  currentClients = Object.keys(clients);
  currentClients.forEach(function(client) {
    if (realClients.indexOf(client) === -1) {
      console.log('deleting dead client', client);
      delete clients[client];
    }
  });
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
    y: event.pageY
  });
}, 1000);

var throttledScroll = throttle(function(){
  socket.emit('scroll', {
    location: window.location.href,
    id: socket.id,
    xOffset: window.pageXOffset, 
    yOffset: window.pageYOffset
  });
}, 1000);

window.login = function(){
  socket.emit('login', {
    username: 'q',
    password: 'q',
    location: window.location.href
  });
};

window.updateTick = function() {
  console.log('updateTick: ', clients);
  var cursors = d3.select('body').selectAll('.clientCursor')
    .data(clients, function(d){console.log('d: ', d);return d.id;});

  cursors.enter()
    .append('div')
    .attr('class', '.clientCursor');

  cursors.transition()
    .duration(490)
    .style({
      top: function(d){return d.y + 'px';},
      left: function(d){return d.x + 'px';}
    });

  cursors.exit()
    .remove();
};

var addCSSRule = function(sheet, selector, rules, index) {
  if("insertRule" in sheet) {
    sheet.insertRule(selector + "{" + rules + "}", index);
  }
  else if("addRule" in sheet) {
    sheet.addRule(selector, rules, index);
  }
};

window.addEventListener('load', function() { 
  window.addEventListener('scroll', function(){
    throttledScroll();
  });
  window.addEventListener('mousemove', function(event){
    throttledMouse(event);
  });

  document.styleSheets[0].insertRule(
    '.clientCursor {' +
      'width: 64px;' +
      'height: 64px;' +
      'position: absolute' +
      'background-repeat: no-repeat;' +
      'background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAABCRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDUuNC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIgogICAgICAgICAgICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgICAgICAgICAgIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyI+CiAgICAgICAgIDx0aWZmOlJlc29sdXRpb25Vbml0PjI8L3RpZmY6UmVzb2x1dGlvblVuaXQ+CiAgICAgICAgIDx0aWZmOkNvbXByZXNzaW9uPjU8L3RpZmY6Q29tcHJlc3Npb24+CiAgICAgICAgIDx0aWZmOlhSZXNvbHV0aW9uPjcyPC90aWZmOlhSZXNvbHV0aW9uPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8dGlmZjpZUmVzb2x1dGlvbj43MjwvdGlmZjpZUmVzb2x1dGlvbj4KICAgICAgICAgPGV4aWY6UGl4ZWxYRGltZW5zaW9uPjY0PC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgICAgPGV4aWY6Q29sb3JTcGFjZT4xPC9leGlmOkNvbG9yU3BhY2U+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj42NDwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgICAgIDxkYzpzdWJqZWN0PgogICAgICAgICAgICA8cmRmOkJhZy8+CiAgICAgICAgIDwvZGM6c3ViamVjdD4KICAgICAgICAgPHhtcDpNb2RpZnlEYXRlPjIwMTUtMDMtMDlUMTc6MDM6NDU8L3htcDpNb2RpZnlEYXRlPgogICAgICAgICA8eG1wOkNyZWF0b3JUb29sPlBpeGVsbWF0b3IgMy4zLjE8L3htcDpDcmVhdG9yVG9vbD4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CrDXXCAAAAg/SURBVHgB5Zp7kI5VHMeXXbfoKhpdkCUjajKNxW5FhUQkknFfl6Y/mommRpluMwilmppqKg0rrFzW5JKGyCiJRmaiJPc1/LHpJlItxvb5bufU6fW83ud5n2f33ct35rPnnOdyzvl9n/Occ56X9LS0tPbwGTSHb+B3qFbaT7QlhoOkL8CNUG00g0itATb9jWMF0AfqQ5VWI6I7ADZ4Nz3L8a0wDq6BKqtpRGYDn0d+CZx0juncEXgVOkANqFJqRzTHQIGuhAxQoK/BYbDmKNUkqWsGwEVQJaQnuhAUYDHklKxOKxHkr4bxsA1cI5TfDhPgWqj06kEEp0GBzbIG2JRjDaAvLIXj4JpRRPktyIZ0qDRy3+W69PoTUBA/QUeC1xJ5jmr0LN07DOXE/dDcueAv8tpTzIE18AtUaLkGqKMPwkzT46cxYIrJeyYY0YQT/WE4ZEFNsNpFRq+V2GMPVrQ01oDGdHAztAAFoLkg4VPEiHpc2wVyoSdcAlY/k1kBWl0+B71mFUaxBqhjU2Gi6eEwDJhv8r4SzGjLhUPgAWjl3KTAN8FcWAVHIeXyMkAB6EnpKWpOuBsTTpEGEkY04gZNmiMgBzLASnPLIlgAO+3BVKReBuhYPgyGYuiOAZrYkhJG1OFGGZALveBysNKWW3sKjYpPIbDR3BNKXgaowu7wEeip5WHAKNLQwozrqGQQyNzrnQrPkN8CMkKGFEG5KJ4BdWldwz8btCR2woR9pJEIIy6lot6g16Mr1AarQjKLQaNwB5Sp4hmgRsfCu6b1ZzBgsslHlmCERphej5FwD2gVsjpBZjW8B+vhT4hc5zNAk5iGZQv4HrIxIeGSyHVJCTMyuVGvh1aQdk4l+iL9CrSMLoMjEJnOZ4AacZfE4RigTpSpMOJiGtBkqVHRFfQ6Win4ApgP+jYJrUQGaKLS2q0lUcOwJyaUy0yNEem0lwXaZfaDK8HqDzLrYA6shaR/xktkAHWXrtWRLImqLBlhRlPuGwjDoH1MHV9T1ojQR1ohBJIfA7pRo5bEWjCHEZBLmhJhRAMa7gG5cCfUBystnR+AllLNXb7kxwC9g2W2JPrqpcdFmHEzh/V63AfNnEv0Rfo8THGOxc3WjHvmvxOqcLYpahenWTrlYiRug/F0pAMoWK0Wkh6YPsx8yY8BqkhfcwdMjUNx/zKTrwiJJujbwI7m3eQn+u2YXwN+pMKFptLWpNrFpVw8CG2iND9ZA/Qp3we0b/AlvwaoMs20x0yto2jc3b6aw+WX0H5/WtOk19K0uoxU88FeU/aVBDFAP5DIbekW6FSaS8Efgn+YZvVAGpvm3ybVEvmDKftOghigSvPgNOjpj4ZyFYHXgsk0+gZcAGfgOZAhJyGw7MTh90bNsOtA755+6tIPp/tIy1wEri3yyzDWNKaPpcdhpiknlQQdAVoSNQqkhjC0NFfGfwhe2+B8sMEXkVfboYLn/n+XDuX9yv1K1JLTmVFQll+JbWhjLmi9l9TmSPhShbAKOgLUnpbEeaZhLYn9TD7yhCd/B5WuARv8BvJ3QSTBU8//fsdX2a8WcOGv5uJcOqq5IVJRZzMqVDtNTcUyfQAcMuVIkmRGgBreAytNDzqTZpt81Ik7SR+m8shftWQNUKCaDE+BvhJHQ6RiXtGTVr1abaSJMAVcU3Q8lMIY8AUtbzGt92bIaj6IVJiwigo122veUeBPwTSTJwmvMAbo6c8yXdCvvPo0jVyYsJpKtcuTCdITMB0iGQlhK9FXoWbklrAfsuiwHbIUoxMjTLP/fNAyLL0IT0KJCskqzAhQm5qUtEGRMuHe0lyAPwTWGPKhADTzewpjtRy6I2EC5dCvQ9gRoM62Ao0CvQYboRudLSZNKAKuz0ULoY+5WPUM4v5CUz4n4Z4eHNSSeIU5qZGgCfKsKQdKwo4ANbYX7JLYiXyODiYSgWRwzStgg9ctHWER55qr4CXM+Zjjg6HInNdIeAnSTTlQEoUBatBdEsf47MEkrnvIXLuTVKuK5MeE9Vw3BKwJj5KfAYFNiMqATTS+GaRePMHW/2S9/3L+Mc5o2EpHQEtdX1BgkkxYzHWZpSWPP4yEeCYEiinQxR79sIdOk5ltCpoLRtgTsSlBjeTYVND8cxxyYTto9dDQ1hCXsmAJ12uF8ZQxQea5I0GvQ1RxebYb76CWxL2gZUm/ETSkg6X/1c6mHOsNClrX6NNas3qsGnJAa7+uEdsg09bhlXL+dtBIsvdobgn8OnBPaD1LDbYTY9zOcjwbjprzZ0nHQTwlY8KtVOaa8DplbdPLVVoStTeQCRuhjkwgbQcHwZoziXwiRWVCRqKGoj6fR4UKVPOCnspVsANs8G+S99spLxNauSMrNk/dXiPBb3vcHl5dqKIYFPCHsM7kVV4E9SCINLesBGugzGwdG7hb5nxKTdB7twFsh226lmP6V5xkpPtWgK3Ljwk5XH/Iuadc54ThTsPq9FZoAmGUjAmdabAQrHHvkK8NZS7tBXaDGt4FmhyjkExYDjYgPyMhZSboPZwOWgGilNdIaOPOAbF5Go9rgnZjlVH6RxLtPPubzmuUDSTwb035nIQdpfYh70Mzc3Im6SOV1QDFcCHkwQAVkB8T2nNdAdhvjOUp2TOrtxHoBHWMgqWmrjak+nY43yunvYnmD6u6NlOZU40EPVU7MX5Hvq3HPHATx+3ErGvngX6QqRKSCUvAmqDfF26wJpDX0N/jnFfw+tflKiWZsACsCQq4LejJ6+vUHtfkGXQ3yi2VQxrS+WCD3U/+oFOeRb5KvPfEEVca2q4J1oxqEbx1JdaEahW8a4J+WdLWOe6w/xs89fdY2fQCEAAAAABJRU5ErkJggg==);' +
    '}', 0
  );
  document.styleSheets[0].insertRule(
    '.glow {' +
      'box-shadow: 0px 0px 32px #ff0;' +
    '}', 0
  );
}, false);
