const path = require('path');
const fs = require('fs');

/**
 * picogw config class
 */
module.exports = class Config {
    /**
     * constructor of this class
     * @param {string} [confPath] path of config.json
     */
    constructor(confPath) {
        this.read(confPath);
    }

    /**
     * read config file from config.json
     * @param {string} [confPath] path of config.json
     */
    read(confPath) {
        if (!confPath) {
            confPath = path.join(process.env.HOME, '.picogw', 'config.json');
            if (!fs.existsSync(confPath)) {
                confPath = path.join(process.cwd(), 'config.json');
            }
        }
        const obj = this._readJSON(confPath) || this._defaultConfig();
        for (const [key, value] of Object.entries(obj)) {
            this[key] = value;
        }
    }

    // eslint-disable-next-line require-jsdoc
    _defaultConfig() {
        return {
            storagePath: path.join(process.env.HOME, '.picogw', 'storage'),
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
