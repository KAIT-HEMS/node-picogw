// Client interface that is passed to each client constructor
'use strict';

/**
 * Client of plugin interface
 */
module.exports = class {
    /**
     * constructor of this class
     * @param {object} globals Parameters of various objects
     */
    constructor(globals) {
        this.globals = globals;
        this.subscriptions = {};
    }

    /**
     * Run plugin 'onCall'
     * @param {object} params The parameters of callProc include method, path and args
     * @return {Promise} Promise object that handles callProc
     */
    callProc(params) {
        if (params.args != undefined &&
            typeof params.args.encrypted == 'string') {
            const plain = this.globals.decrypt(params.args.encrypted);
            params.args = JSON.parse(plain);
        }
        return this.globals.callProc({
            method: params.method,
            path: params.path,
            args: params.args,
        });
    }

    /**
     * Subscribe to various data
     * @param {string} topicname The topic name of the data. You can use regular expressions.
     * @param {fuction} callback Specify the callback function when topicname is published.
     */
    subscribe(topicname, callback) {
        if (topicname.slice(-1)=='/') topicname=topicname.slice(0, -1);
        if (this.subscriptions[topicname] == undefined) {
            this.subscriptions[topicname] = [];
        }
        if (this.subscriptions[topicname].indexOf(callback)>=0) {
            return;
        } // Cannot subscribe multiple times
        this.globals.PubSub.sub(topicname, callback);
        this.subscriptions[topicname].push(callback);
    }

    /**
     * Unsubscribe the specified topicname and callback
     * @param {string} topicname The topic name of the data. You can use regular expressions.
     * @param {fuction} callback Specify the callback you want to unsubscribe. If you do not specify anything, unsubscribe to all callbacks associated with topicname.
     */
    unsubscribe(topicname, callback) {
        this.globals.PubSub.unsub(topicname, callback);
        if (this.subscriptions[topicname] == undefined
            || this.subscriptions[topicname].indexOf(callback) < 0) {
            return;
        } // Should never happen
        this.subscriptions[topicname]
            = this.subscriptions[topicname].filter((f)=>f!=callback);
        if (this.subscriptions[topicname].length == 0) {
            delete this.subscriptions[topicname];
        }
    }

    // Topicname can be undefined to remove all subscriptions of this client.
    // TODO:Delete this function and merge unsubscribe(topicname==undefined)
    // eslint-disable-next-line require-jsdoc
    unsubscribeall(topicname) {
        if (topicname == undefined) {
            for (const [tn, cbs] of Object.entries(this.subscriptions)) {
                for (const cb of cbs) {
                    this.globals.PubSub.unsub(tn, cb);
                }
            }
            this.subscriptions = {};
        } else {
            for (const cb of this.subscriptions[topicname]) {
                this.globals.PubSub.unsub(topicname, cb);
            }
            delete this.subscriptions[topicname];
        }
    }
};
