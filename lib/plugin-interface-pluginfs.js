'use strict';

const fs = require('fs');
const pathm = require('path');

/**
 * Interface of Plugin FS
 */
module.exports = class {
    /**
     * constructor of this class
     * @param {string} pluginPath Module load path
     */
    constructor(pluginPath) {
        this._pluginPath = pluginPath;
    }

    /**
     * Asynchronously reads the entire contents of a file
     * @param {string} path : file path from plugin's root directory
     * @param {object} [options] : options of readFile. same as fs.readFile() options.
     * @param {function} callback : callback function
     */
    readFile(path, options, callback) {
        path = pathm.join(this._pluginPath, path);
        fs.readFile(path, options, callback);
    }

    /**
     * Synchronous version of readFile(). Returns the contents of the path.
     * @param {string} path : file path from plugin's root directory
     * @param {object} [options] : options of readFile. same as fs.readFile() options.
     * @return {function} callback : callback function
     */
    readFileSync(path, options) {
        path = pathm.join(this._pluginPath, path);
        return fs.readFileSync(path, options);
    }
};
