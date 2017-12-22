const WS_SUBPROTOCOL = 'picogw';

const WebSocketServer = require('websocket').server;
const express = require('express');
const bodyParser = require('body-parser');
const log = console.log;
let server;
let http;
let onMessageFunc;
let onCloseFunc;

/**
 * Start HTTP server
 * @param {number} port HTTP port
 */
function start(port) {
    http = express();
    http.use(bodyParser.urlencoded({extended: true}));
    http.use(bodyParser.json());
    http.use(function(e, req, res, next) {
        res.jsonp(e); // Catch json error
    });
    startServer(port);
};

/**
 * Restart HTTP server
 * @param {number} port HTTP port
 */
function restart(port) {
    startServer(port);
}

/**
 * Add an endpoint to the HTTP server
 * @param {string} method : HTTP method 'get', 'put', 'post' or 'all'
 * @param {string} path : URL path
 * @param {function} callback : Callback when specified method and path are requested
 */
function endpoint(method, path, callback) {
    http[method](path, callback);
}


/**
 * Add WebSocket 'message' event handler
 * @param {function} callback : WebSocket 'message' event callback function
 */
function onMessage(callback) {
    onMessageFunc = callback;
}

/**
 * Add WebSocket 'close' event handler
 * @param {function} callback : WebSocket 'close' event callback function
 */
function onClose(callback) {
    onCloseFunc = callback;
}


module.exports.start = start;
module.exports.restart = restart;
module.exports.endpoint = endpoint;
module.exports.onMessage = onMessage;
module.exports.onClose = onClose;

// eslint-disable-next-line require-jsdoc
function startServer(port) {
    if (server != undefined) server.close();

    server = http.listen(port, function() {
        log('Web server is waiting on port '+port+'.');
    });

    // TODO: http.get('xxx', callback);

    let wsServer = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: false,
    });

    const originIsAllowed = (origin) => {
        // put logic here to detect whether the specified origin is allowed.
        return true;
    };

    wsServer.on('request', function(request) {
        if (!originIsAllowed(request.origin)) {
            // Make sure we only accept requests from an allowed origin
            request.reject();
            log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.'); // eslint-disable-line max-len
            return;
        }

        let connection;
        try {
            connection = request.accept(WS_SUBPROTOCOL, request.origin);
        } catch (e) {
            console.error(e);
            return;
        }

        // log((new Date()) + ' Connection accepted.');
        connection.on('message', function(message) {
            if (onMessageFunc) {
                onMessageFunc(message);
            }
        });
        connection.on('close', function(reasonCode, description) {
            if (onCloseFunc) {
                onCloseFunc(reasonCode, description);
            }
        });
    });
}
