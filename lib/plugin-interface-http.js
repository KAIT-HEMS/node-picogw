'use strict';

const httpServer = require('./http-server');

/**
 * Interface of http library
 */
module.exports = class {
    /**
     * constructor of this class
     */
    constructor() {
    }

    /**
     * Add an endpoint to the HTTP server
     * @param {string} method : HTTP method 'get', 'put', 'post' or 'all'
     * @param {string} path : URL path
     * @param {function} callback : Callback when specified method and path are requested
     */
    endpoint(method, path, callback) {
        httpServer.endpoint(method, path, callback);
    }

    /**
     * Add WebSocket 'message' event handler
     * @param {function} callback : WebSocket 'message' event callback function
     */
    onMessage(callback) {
        httpServer.onMessage(callback);
    }

    /**
     * Add WebSocket 'close' event handler
     * @param {function} callback : WebSocket 'close' event callback function
     */
    onClose(callback) {
        httpServer.onClose(callback);
    }
};
