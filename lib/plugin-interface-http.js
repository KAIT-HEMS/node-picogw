'use strict';

const httpServer = require('./http-server');

/**
 * Interface of http library
 */
module.exports = class {
    /**
     * constructor of this class
     * @param {boolean} isDefaultPlugin: Whether the default plugin
     */
    constructor(isDefaultPlugin) {
        const priority = isDefaultPlugin ? 0 : 1; // 0:low priority 1:high priority
        /**
         * Add an endpoint to the HTTP server
         * @param {string} method : HTTP method 'get', 'put', 'post' or 'all'
         * @param {string} path : URL path
         * @param {function} callback : Callback when specified method and path are requested
         */
        this.endpoint = (method, path, callback) => {
            httpServer.endpoint(priority, method, path, callback);
        };

        /**
         * Add WebSocket 'message' event handler
         * @param {function} callback : WebSocket 'message' event callback function
         */
        this.onMessage = (callback) => {
            httpServer.onMessage(priority, callback);
        };

        /**
         * Add WebSocket 'close' event handler
         * @param {function} callback : WebSocket 'close' event callback function
         */
        this.onClose = (callback) => {
            httpServer.onClose(priority, callback);
        };
    }
};
