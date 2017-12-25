'use strict';

const path = require('path');
const fs = require('fs-extra');
const ROLE = require('./controller').ROLE;
const PluginInterfaceServer = require('./plugin-interface-server');
const PluginInterfaceNet = require('./plugin-interface-net');
const PluginInterfaceSetting = require('./plugin-interface-setting');
const PluginInterfaceClient = require('./plugin-interface-client');
const PluginInterfaceCrypt = require('./plugin-interface-crypt');
const PluginInterfaceHttp = require('./plugin-interface-http');
const QuotaLocalStorage = require('./my-local-storage').QuotaLocalStorage;

/**
 * Plugin interface class
 */
module.exports.PluginInterface = class {
    /**
     * constructor of this class
     * @param {object} globals Parameters of various objects
     * @param {string} pluginName The name of plugin
     * @param {Array.<string>} role The roles of plugin
     * @param {string} modulePath Module load path
     * @param {boolean} legacy If true, the plugin is an old architecture
     * @param {string} storagePath Data storage path
     * @param {boolean} isDefaultPlugin: Whether the default plugin
     */
    constructor(globals, pluginName, role, modulePath,
        legacy, storagePath, isDefaultPlugin) {
        modulePath = path.dirname(modulePath) + '/';
        this.makeCommon(globals, pluginName, role, legacy, storagePath);

        if (role.includes(ROLE.SERVER)) {
            this.server = new PluginInterfaceServer(globals, pluginName);
            this.net = new PluginInterfaceNet(globals, this, pluginName);
        }
        this.setting = new PluginInterfaceSetting(
            globals, pluginName, modulePath, storagePath);
        if (role.includes(ROLE.CLIENT)) {
            this.client = new PluginInterfaceClient(globals);
        }
        this.crypt = new PluginInterfaceCrypt(globals);
        if (role.includes(ROLE.HTTP)) {
            this.http = new PluginInterfaceHttp(isDefaultPlugin);
        }

        // if (legacy) {
        this._makeLegacyAPIs(role, modulePath);
        this.cmd_opts = globals.cmd_opts;
        this.getprefix = () => {
            return pluginName;
        };
        this.getpath = () => {
            return modulePath;
        };
        // }
    }

    /**
     * Make common interface
     * @param {object} globals Parameters of various objects
     * @param {string} pluginName The name of plugin
     * @param {Array.<string>} role The roles of plugin
     * @param {boolean} legacy If true, the plugin is an old architecture
     * @param {string} storagePath Data storage path
     */
    makeCommon(globals, pluginName, role, legacy, storagePath) {
        this.log = (...args) => {
            args.unshift(`${pluginName} plugin>`);
            console.log(...args);
        };
        const pt = this.constructor.getLocalStoragePath(
            storagePath, pluginName);
        this.localStorage = new QuotaLocalStorage(pt);
    }

    /**
     * Make common interface
     * @param {string} storagePath Data storage path
     * @param {string} pluginName The name of plugin
     * @return {string} path of localStorage
     */
    static getLocalStoragePath(storagePath, pluginName) {
        const pt = path.join(storagePath, `${pluginName}/local-storage`);
        if (!fs.existsSync(pt)) {
            fs.mkdirsSync(pt);
        }
        return pt;
    }

    // Delete this function as soon as the migration of the new plugin architecture is completed.
    // eslint-disable-next-line require-jsdoc
    _makeLegacyAPIs(role, pluginName) {
        /*
        if (role.includes(ROLE.SERVER)) {
            this.getMACFromIPv4Address = (net, ip, bSearch) => {
                return this.net.getMACFromIPv4Address(net, ip, bSearch);
            };
            this.setNetCallbacks = (func) => {
                return this.net.setNetCallbacks(func);
            };
            this.getMACs = (bSelfOnly) => {
                return this.net.getMACs(bSelfOnly);
            };
        }
*/

        this.on = (funcName, func) => {
            if (funcName === 'SettingsUpdated') {
                this.setting.onUISetSettings = func;
            } else {
                throw new Error(`Unsupported on(${funcName}, ...)`);
            }
        };

        this.setOnGetSettingsSchemaCallback = (func) => {
            this.setting.onUIGetSettingsSchema = func;
        };
        this.setOnSettingsUpdatedCallback = (func) => {
            this.setting.onUISetSettings = func;
        };

        this.getpath = () => {
            return pluginName;
        };

        this.publish = (topicname, args) => {
            return this.server.publish(topicname, args);
        };
    }
};
