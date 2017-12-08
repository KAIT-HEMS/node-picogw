'use strict';

/**
 * Server of plugin interface
 */
module.exports = class {
    /**
     * constructor of this class
     * @param {object} globals Parameters of various objects
     * @param {string} pluginName The name of plugin
     */
    constructor(globals, pluginName) {
        this.globals = globals;
        this.pluginName = pluginName;
    }

    /**
     * Publish to various data
     * @param {string} topicname The topic name of the data.
     * @param {object} args Publish data
     * @param {fuction} callback Specify the callback function when topicname is published.
     */
    publish(topicname, args) {
        let path;
        if (topicname==null || topicname==='') {
            path = `/${this.pluginName}`;
        } else {
            if (topicname.slice(-1)==='/') {
                topicname = topicname.slice(0, -1);
            }
            path = `/${this.pluginName}/${topicname}`;
        }

        let re = {method: 'PUB'};
        re[path] = args;
        this.globals.PubSub.pub(path, re);
    }
};
