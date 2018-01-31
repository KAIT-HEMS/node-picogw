const path = require('path');
const fs = require('fs-extra');

/**
 * picogw config class
 */
module.exports = class Config {
    /**
     * constructor of this class
     * @param {string} [confPath] path of config.json
     */
    constructor(confPath) {
        this._config = this.read(confPath);
    }

    /**
     * read config file from config.json
     * @param {string} [confPath] path of config.json
     * @return {object} Return the read config
     */
    read(confPath) {
        if (!confPath) {
            confPath = path.join(process.env.HOME, '.picogw', 'config.json');
            if (!fs.existsSync(confPath)) {
                confPath = path.join(process.cwd(), 'config.json');
            }
        }
        const defaultConf = this._defaultConfig();
        const prevConf = this._readJSON(confPath);
        const currentConf = this._overwriteObj(defaultConf, prevConf);
        this._mkdirs(currentConf);
        for (const [key, value] of Object.entries(currentConf)) {
            this[key] = value;
        }
        return currentConf;
    }

    /**
     * Get config keys
     * @return {Array.<string>} Return keys of config
     */
    keys() {
        return Object.keys(this._config);
    }

    // eslint-disable-next-line require-jsdoc
    _defaultConfig() {
        const defaultPath = path.join(process.env.HOME, '.picogw');
        return {
            storagePath: path.join(defaultPath, 'storage'),
            localNpmPath: path.join(defaultPath, 'local-npms'),
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

    // eslint-disable-next-line require-jsdoc
    _overwriteObj(a, b) {
        return Object.assign(JSON.parse(JSON.stringify(a)), b);
    }

    // eslint-disable-next-line require-jsdoc
    _mkdirs(conf) {
        if (!fs.existsSync(conf.storagePath)) {
            fs.mkdirsSync(conf.storagePath);
        }
        if (!fs.existsSync(conf.localNpmPath)) {
            fs.mkdirsSync(conf.localNpmPath);
        }
    }
};
