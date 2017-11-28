'use strict'

const path = require('path');
const fs = require('fs');
const ROLE = require('./controller').ROLE;
const PluginInterfaceServer = require('./plugin-interface-server');
const PluginInterfaceNet = require('./plugin-interface-net');
const PluginInterfaceSetting = require('./plugin-interface-setting');
const PluginInterfaceClient = require('./plugin-interface-client');
const PluginInterfaceCrypt = require('./plugin-interface-crypt');
const SingleFileLocalStorage = require('../MyLocalStorage').SingleFileLocalStorage;

module.exports.PluginInterface = class {
    constructor(globals, pluginName, role, modulePath, legacy) {
        if (!legacy) {
            modulePath = path.dirname(modulePath) + '/';
        }
        this.makeCommon(globals, pluginName, role, legacy);

        if (role.includes(ROLE.SERVER)) {
            this.server = new PluginInterfaceServer(globals, pluginName);
            this.net = new PluginInterfaceNet(globals, pluginName);
        }
        this.setting = new PluginInterfaceSetting(globals, pluginName, modulePath, this._getStoragePath(pluginName));
        if (role.includes(ROLE.CLIENT)) {
            this.client = new PluginInterfaceClient(globals);
        }
        this.crypt = new PluginInterfaceCrypt(globals);

        //if (legacy) {
        this._makeLegacyAPIs(role, modulePath);
        this.cmd_opts = globals.cmd_opts;
        this.getprefix = () => {
            return pluginName
        }
        this.getpath = () => {
            return modulePath;
        }
        //}
    }

    makeCommon(globals, pluginName, role, legacy) {
        this.log = (...args) => {
            args.unshift(`${pluginName} plugin>`);
            console.log(...args);
        }
        const storagePath = this._getStoragePath(pluginName);
        this.localStorage = new SingleFileLocalStorage(path.join(storagePath, `${pluginName}.json`));
    }

    _getStoragePath(pluginName) {
        // TODO: Change path from settings
        const pt = path.join(path.dirname(__dirname), 'storage');
        if (!fs.existsSync(pt)) {
            fs.mkdirSync(pt);
        }
        return pt;
    }

    // Delete this function as soon as the migration of the new plugin architecture is completed.
    _makeLegacyAPIs(role, pluginName) {
        if (role.includes(ROLE.SERVER)) {
            this.getMACFromIPv4Address = (net,ip,bSearch) => {
                return this.net.getMACFromIPv4Address(net,ip,bSearch);
            }
            this.setNetCallbacks = (func) => {
                return this.net.setNetCallbacks(func);
            }
            this.getMACs = (bSelfOnly) => {
                return this.net.getMACs(bSelfOnly);
            }
        }

        this.on = (funcName, func) => {
            if (funcName === 'SettingsUpdated') {
                this.setting.onUISetSettings = func;
            } else {
                throw new Error(`Unsupported on(${funcName}, ...)`);
            }
        }

        this.setOnGetSettingsSchemaCallback = (func) => {
            this.setting.onUIGetSettingsSchema = func;
        }
        this.setOnSettingsUpdatedCallback = (func) => {
            this.setting.onUISetSettings = func;
        }

        this.getpath = () => {
            return pluginName;
        }

        this.publish = (topicname, args) => {
            return this.server.publish(topicname, args);
        }
    }
}
