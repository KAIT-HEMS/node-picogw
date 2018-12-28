'use strict';

/**
 * Interface of config
 */
module.exports = class {
    /**
     * constructor of this class
     * @param {object} config : Application config class
     */
    constructor(config) {
        if (config) {
            for (const key of config.keys()) {
                Object.defineProperty(this, key, {
                    get: function() {
                        return config[key];
                    },
                    set: function(v) {
                        throw new Error(`can't write config.${key}`);
                    },
                });
            }
        }
    }
};
