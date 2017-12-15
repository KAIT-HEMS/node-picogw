const path = require('path');
const fs = require('fs');

/**
 * picogw settings class
 */
module.exports = class Setting {
    /**
     * constructor of this class
     * @param {string} [confPath] path of settings.json
     */
    constructor(confPath) {
        this.read(confPath);
    }

    /**
     * read config file from settings.json
     * @param {string} [confPath] path of settings.json
     */
    read(confPath) {
        if (!confPath) {
            confPath = path.join(process.cwd(), 'settings.json');
        }
        const obj = this._readJSON(confPath) || this._defaultSettings();
        for (const [key, value] of Object.entries(obj)) {
            this[key] = value;
        }
    }

    // eslint-disable-next-line require-jsdoc
    _defaultSettings() {
        return {
            // TODO: In the case of a global installation,
            // it should return the root path of node
            // in case of local installation in the current directory
            storagePath: path.join(process.cwd(), 'storage'),
        };
    }

    // eslint-disable-next-line require-jsdoc
    _readJSON(file) {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf-8').toString());
        } else {
            return undefined;
        }
    }
};
