const WS_SUBPROTOCOL = 'picogw';

const WebSocketServer = require('websocket').server;
const express = require('express');
const bodyParser = require('body-parser');
const log = console.log;
let server;
let http;
const onMessageCallback = {};
const onCloseCallback = {};
const endpoints = [];
let alreadyAppliedEndpoints = false;

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
 * @param {njmber} priority : Priority of the path. Larger values have higher priority
 * @param {string} method : HTTP method 'get', 'put', 'post' or 'all'
 * @param {string} path : URL path
 * @param {function} callback : Callback when specified method and path are requested
 */
function endpoint(priority, method, path, callback) {
    endpoints.push({priority, method, path, callback});
    if (alreadyAppliedEndpoints) {
        log('Warning: endpoint() needs to be called in the plugin\'s init()');
        http[method](path, (req, res, next) => {
            return callback(req, res, next);
        });
    }
}

/**
 * Apply endpoints to the HTTP server
 */
function applyEndpoints() {
    sortEndpoints();
    for (const ep of endpoints) {
        http[ep.method](ep.path, (req, res, next) => {
            return ep.callback(req, res, next);
        });
    }
    alreadyAppliedEndpoints = true;
}

/**
 * Sort endpoints
 * @return {Array.<object>} Sorted endpoints array
 */
function sortEndpoints() {
    endpoints.sort((a, b) => {
        if (a.path === '*' && b.path !== '*') {
            return 1;
        } else if (a.path !== '*' && b.path === '*') {
            return -1;
        }
        return b.priority - a.priority;
    });
    return endpoints;
}


/**
 * Add WebSocket 'message' event handler
 * @param {number} priority : Priority of the path. Larger values have higher priority
 * @param {function} callback : WebSocket 'message' event callback function
 */
function onMessage(priority, callback) {
    if (onMessageCallback) {
        if (onMessageCallback.priority >= priority) {
            return;
        }
    }
    onMessageCallback.priority = priority;
    onMessageCallback.callback = callback;
}

/**
 * Add WebSocket 'close' event handler
 * @param {number} priority : Priority of the path. Larger values have higher priority
 * @param {function} callback : WebSocket 'close' event callback function
 */
function onClose(priority, callback) {
    if (onCloseCallback) {
        if (onCloseCallback.priority >= priority) {
            return;
        }
    }
    onCloseCallback.priority = priority;
    onCloseCallback.callback = callback;
}


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
            if (onMessageCallback) {
                onMessageCallback.callback(connection, message);
            }
        });
        connection.on('close', function(reasonCode, description) {
            if (onCloseCallback) {
                onCloseCallback.callback(reasonCode, description);
            }
        });
    });
}

module.exports.start = start;
module.exports.restart = restart;
module.exports.endpoint = endpoint;
module.exports.onMessage = onMessage;
module.exports.onClose = onClose;
module.exports.applyEndpoints = applyEndpoints;

// exports for test
module.exports.sortEndpointsForTest = sortEndpoints;
