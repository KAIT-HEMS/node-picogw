// Plugin interface that is passed to each plugin constructor
'use strict';

// TODO:remove this eslint rule later.
/* eslint-disable require-jsdoc */

const fs = require('fs');
const path = require('path');
const SLocalStorage = require('./my-local-storage').SingleFileLocalStorage;


exports.PluginInterface = class {
    constructor(globals, prefix, modulePath) {
        this.globals = globals;
        this.prefix = prefix;
        this.dirname = path.dirname(modulePath);
        this.log = (msg) => {
            console.log(`${this.prefix} plugin> ${msg}`);
        };

        this.localStorage = new SLocalStorage(
            this.getpath() + 'localstorage.json');
        this.localSettings = new SLocalStorage(
            this.getpath() + 'settings.json');

        // These can return Promise, but never call reject().
        this.getSettingsSchema = ()=>{
            try {
                return JSON.parse(fs.readFileSync(
                    this.getpath() + 'settings_schema.json').toString());
            } catch (e) {}
        };
        this.getSettings = ()=>{
            try {
                return JSON.parse(fs.readFileSync(
                    this.getpath() + 'settings.json').toString());
            } catch (e) {}
        };

        this.onSettingsUpdated = (newsettings)=>{};
    }
    setOnGetSettingsSchemaCallback(callback) {
        this.getSettingsSchema = callback;
    }
    setOnGetSettingsCallback(callback) {
        this.getSettings = callback;
    }
    setOnSettingsUpdatedCallback(callback) {
        this.onSettingsUpdated = callback;
    }

    publish(topicname, args) {
        let path;
        if (topicname==null || topicname==='') {
            path = `/${this.globals.VERSION}/${this.prefix}`;
        } else {
            if (topicname.slice(-1)=='/') topicname=topicname.slice(0, -1);
            path = `/${this.globals.VERSION}/${this.prefix}/${topicname}`;
        }

        const re = {method: 'PUB'};
        re[path] = args;
        this.globals.PubSub.pub(path, re);
    }

    // Returns promise
    getMACFromIPv4Address(net, ip, bSearch) {
        if (this.prefix == 'admin') {
            const msg = 'Cannot call getMacFromIPv4Address from admin plugin';
            return Promise.reject(msg);
        }
        return this.globals.admin.getMACFromIPv4Address_Forward(
            net, ip, bSearch);
    }

    /**
     * Set the network callback function
     * @param {Array.<function>} callbacksObj can contain the following three members
     *   onMacFoundCallback   : function(net,newmac,newip)
     *   onMacLostCallback    : function(net,lostmac,lostip)
     *   onIPChangedCallback  : function(net,mac,oldip,newip)
     */
    setNetCallbacks(callbacksObj) {
        this.globals.admin.setNetCallbacks_Forward(this.prefix, callbacksObj);
    }

    // If the argument is true, returns only self macs.
    // Otherwise, returns all macs recognized
    getMACs(bSelfOnly) {
        return this.globals.admin.getMACs(bSelfOnly);
    }


    getPubKey() {
        return this.globals.getPubKey();
    }
    encrypt(str) {
        return this.globals.encrypt(str);
    }
    decrypt(str) {
        return this.globals.decrypt(str);
    }
    // handlerName = 'SettingsUpdated', etc...
    on(handlerName, handlerBody) {
        this['on'+handlerName] = handlerBody;
    }
    off(handlerName) {
        delete this['on'+handlerName]; this['on'+handlerName] = undefined;
    }
    // Get plugin home dir
    getpath() {
        return path.join(this.dirname, '/');
    }

    getprefix() {
        return this.prefix;
    }
};
