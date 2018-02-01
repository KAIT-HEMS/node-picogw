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
let callProc;
let subscribeFuncs = {};
let PubSub;

/**
 * Initialize HTTP server
 * @param {object} params : Parameters of HTTP server
 */
function init(params) {
    callProc = params.callProc;
    PubSub = params.PubSub;
}

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
    startServer(port, true);
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

/**
 * Start HTTP server
 * @param {number} port : HTTP listen port
 * @param {boolean} [isRestart] : Whether restart or not
 */
function startServer(port, isRestart) {
    if (server != undefined) server.close();

    server = http.listen(port, function() {
        log('Web server is waiting on port '+port+'.');
    });

    if (!isRestart) {
        _addAPIEndpoint();
    }

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

        connection.on('message', function(message) {
            _defaultSocketMessageProc(connection, message);
            if (onMessageCallback.callback) {
                onMessageCallback.callback(connection, message);
            }
        });
        connection.on('close', function(reasonCode, description) {
            _defaultSocketCloseProc(reasonCode, description);
            if (onCloseCallback.callback) {
                onCloseCallback.callback(reasonCode, description);
            }
        });
    });
}


// eslint-disable-next-line require-jsdoc
function _addAPIEndpoint() {
    // REST API call
    const priority = 0; // 0 means most low priority
    endpoint(priority, 'all', `/v*/*`, function(req, res, next) {
        // for( var e in req ){if( typeof req[e] == 'string') log(e+':'+req[e]);}
        // var caller_ip = req.ip ;
        let args = req.body;
        // Overwrite args in body with GET parameters
        if (req.originalUrl.indexOf('?') >= 0) {
            const pos = req.originalUrl.indexOf('?')+1;
            req.originalUrl.slice(pos).split('&').forEach((eq)=>{
                let terms = eq.split('=');
                if (terms[0] === 'callback' ||
                    terms[0] === 'jsoncallback') {
                    return;
                }
                if (terms.length === 1) {
                    args.value = decodeURIComponent(terms[0]);
                } else {
                    args[terms[0]] = decodeURIComponent(terms[1]);
                }
            });
        }

        // When converting to JSON, give it to an object, as a numeric value when it can convert to a numerical value, otherwise as a character string to a plugin
        for (let k in args) {
            if (typeof args[k] == 'string') {
                try {
                    args[k] = JSON.parse(args[k]);
                } catch (e) {
                    if (args[k].trim().match(/^[0-9a-bx]+$/i)) {
                        if (isFinite(parseInt(args[k]))) {
                            args[k] = parseInt(args[k]);
                        }
                    }
                }
            }
        }
        callProc({method: req.method, path: req.path, args: args}).then((re)=>{
            if (re instanceof Error) {
                log('response error', re);
                re = {error: `${re.name}: ${re.message}`};
            }
            res.jsonp(re);
        }).catch((e)=>{
            next();
            /* console.error*/
        });
    });
}


// eslint-disable-next-line require-jsdoc
function _defaultSocketMessageProc(connection, message) {
    if (message.type === 'utf8') {
        log('Received Message: ' + message.utf8Data);
        let req;
        try {
            req = JSON.parse(message.utf8Data);
            if (req.method.toUpperCase() == 'SUB') {
                let cbfunc = function(re) {
                    connection.sendUTF(JSON.stringify(re));
                };
                if (subscribeFuncs[req.path] == undefined) {
                    PubSub.sub(req.path, cbfunc);
                    subscribeFuncs[req.path] = cbfunc;
                }
                connection.sendUTF(JSON.stringify(
                    {success: true, tid: req.tid}));
            } else if (req.method.toUpperCase() == 'UNSUB') {
                if (subscribeFuncs[req.path] != undefined) {
                    PubSub.unsub(req.path, subscribeFuncs[req.path]);
                    delete subscribeFuncs[req.path];
                }
                connection.sendUTF(JSON.stringify(
                    {success: true, tid: req.tid}));
            } else {
                callProc(req).then((re)=>{
                    re.tid = req.tid;
                    connection.sendUTF(JSON.stringify(re)+'\n');
                }).catch((e)=>{
                    e.tid = req.tid;
                    connection.sendUTF(JSON.stringify(e)+'\n');
                });
            }
        } catch (e) {
            log('Error in receiving websocket message');
            log(JSON.stringify(e));
            log(e);
        }
    } else if (message.type === 'binary') {
        log('Received Binary Message of ' + message.binaryData.length + ' bytes. Ignore.'); // eslint-disable-line max-len
        // connection.sendBytes(message.binaryData);
    }
}

// eslint-disable-next-line require-jsdoc
function _defaultSocketCloseProc(reasonCode, description) {
    for (const path of Object.keys(subscribeFuncs)) {
        PubSub.unsub(path, subscribeFuncs[path]);
    }
    subscribeFuncs = {};
}

module.exports.init = init;
module.exports.start = start;
module.exports.restart = restart;
module.exports.endpoint = endpoint;
module.exports.onMessage = onMessage;
module.exports.onClose = onClose;
module.exports.applyEndpoints = applyEndpoints;

// exports for test
module.exports.sortEndpointsForTest = sortEndpoints;
