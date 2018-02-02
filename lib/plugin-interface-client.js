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
        this._globals = globals;
        this._subscriptions = {};
    }

    /**
     * Run plugin 'onCall'
     * @param {object} params The parameters of callProc include method, path and args
     * @return {Promise} Promise object that handles callProc
     */
    callProc(params) {
        return this._globals.callProc({
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
        if (this._subscriptions[topicname] == undefined) {
            this._subscriptions[topicname] = [];
        }
        if (this._subscriptions[topicname].indexOf(callback)>=0) {
            return;
        } // Cannot subscribe multiple times
        this._globals.PubSub.sub(topicname, callback);
        this._subscriptions[topicname].push(callback);
    }

    /**
     * Unsubscribe the specified topicname and callback
     * @param {string} topicname The topic name of the data. You can use regular expressions.
     * @param {fuction} callback Specify the callback you want to unsubscribe. If you do not specify anything, unsubscribe to all callbacks associated with topicname.
     */
    unsubscribe(topicname, callback) {
        this._globals.PubSub.unsub(topicname, callback);
        if (this._subscriptions[topicname] == undefined
            || this._subscriptions[topicname].indexOf(callback) < 0) {
            return;
        } // Should never happen
        this._subscriptions[topicname]
            = this._subscriptions[topicname].filter((f)=>f!=callback);
        if (this._subscriptions[topicname].length == 0) {
            delete this._subscriptions[topicname];
        }
    }

    // Topicname can be undefined to remove all subscriptions of this client.
    // TODO:Delete this function and merge unsubscribe(topicname==undefined)
    // eslint-disable-next-line require-jsdoc
    unsubscribeall(topicname) {
        if (topicname == undefined) {
            for (const [tn, cbs] of Object.entries(this._subscriptions)) {
                for (const cb of cbs) {
                    this._globals.PubSub.unsub(tn, cb);
                }
            }
            this._subscriptions = {};
        } else {
            for (const cb of this._subscriptions[topicname]) {
                this._globals.PubSub.unsub(topicname, cb);
            }
            delete this._subscriptions[topicname];
        }
    }
};
