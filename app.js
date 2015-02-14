var Hapi = require('hapi');
var _ = require('underscore');
var async = require('async');
var request = require('request');

var graphData = {
  vertices: {
    '3001' : [ '3002', '3003' ],
    '3002' : [ '3001', '3003' ],
    '3003' : [ '3001', '3002' ]
  }
};

var myId = process.argv[2];

if (!myId) {
  throw 'Cannot start without a port/id';
}

var server = new Hapi.Server();

var neighbors = {
  
};

var myColor = 'undecided';

server.connection({ port: myId } );

function isHighestUndecided() {
  var maxUndecided = 0;
  var n = null;

  if (myColor !== 'undecided') {
    return false;
  }
  for (var i = 0; i < graphData.vertices[myId].length; i++) {
    n = graphData.vertices[myId][i];
    if (!neighbors[n]) {
      return false;
    }
    if (neighbors[n] === 'undecided' && Number(n) > maxUndecided) {
      maxUndecided = Number(n);
    }
  }
  if (Number(myId) > maxUndecided) {
    return true;
  }
  return false;
}

function firstFree() {
  var color = 1;

  while (true) {
    if (_.values(neighbors).indexOf(color) > -1) {
      color += 1;
    } else {
      return color;
    }
  }
}

function informNeighbors(callback) {
  
  async.each(
    graphData.vertices[myId],
    function(n, cb) {
      var informRequest = request.post( 'http://localhost:' + n + '/color', {
        form: {
          nodeId: myId,
          color: myColor
        }
      }, function(err, httpResponse, body) {
        if (err || httpResponse.statusCode != 200) {
          return cb('cannot connect to neighbor ' + n);
        }
        cb();
      });
    },
    callback
  );
}

function convertNumber(color) {
  if (color === 'undecided') {
    return color;
  }
  return Number(color);
}

server.route({
  method: 'POST',
  path: '/color',
  handler: function(request, reply) {
    var nodeId = request.payload.nodeId;
    var color = request.payload.color;
    
    neighbors[nodeId] = convertNumber(color);
    if (isHighestUndecided()) {
      myColor = firstFree();
      console.log('Node ' + myId + ' just picked color: ' + myColor);
      informNeighbors();
    }
    reply('ok');
  }
});

server.start(function(err) {
  if (err) {
    console.log('Problem starting server:\n', err);
    throw err;
  }
  console.log('Node listening on port ' + myId);
});

var pushInterval = setInterval(function() {
  console.log("Trying to push notifications to neighbors...\n");
  informNeighbors(function(err) {
    if (!err) {
      clearInterval(pushInterval);
    }
  });
}, 1000);
