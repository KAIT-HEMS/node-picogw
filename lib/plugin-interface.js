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
const PluginInterfacePluginFS = require('./plugin-interface-pluginfs');
const PluginInterfaceConfig = require('./plugin-interface-config');
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
     * @param {string} storagePath Data storage path
     * @param {boolean} isDefaultPlugin: Whether the default plugin
     */
    constructor(globals, pluginName, role, modulePath,
        storagePath, isDefaultPlugin) {
        modulePath = path.dirname(modulePath);
        this.makeCommon(globals, pluginName, role, storagePath);

        if (role.includes(ROLE.SERVER)) {
            this.server = new PluginInterfaceServer(globals, pluginName);
            this.net = new PluginInterfaceNet(globals, this, pluginName);
        }
        this.setting = new PluginInterfaceSetting(
            modulePath,
            this.constructor.getSettingsPath(storagePath, pluginName));
        if (role.includes(ROLE.CLIENT)) {
            this.client = new PluginInterfaceClient(globals,pluginName);
        }
        this.crypt = new PluginInterfaceCrypt(globals);
        if (role.includes(ROLE.HTTP)) {
            this.http = new PluginInterfaceHttp(isDefaultPlugin);
        }
        this.pluginfs = new PluginInterfacePluginFS(modulePath);
        this.config = new PluginInterfaceConfig(globals.config);

        modulePath += '/';

	// Process plugin-only argument
        //this.cmd_opts = globals.cmd_opts;
        this.cmd_opts = {};
	for( let k1 in globals.cmd_opts ){
		if( k1 !== 'plugin_args' ){
			this.cmd_opts[k1] = globals.cmd_opts[k1];
			continue;
		}
		for( let k2 in globals.cmd_opts.plugin_args ){
			if( pluginName !== k2 ) continue;
			const pluginArgDic = globals.cmd_opts.plugin_args[pluginName];
			for( let k3 in pluginArgDic ){
				if( globals.cmd_opts[k3] != null ){
					console.log(`Cannot override ${pluginName} plugin argument '${k3}'.`);
					continue;
				}
				this.cmd_opts[k3] = globals.cmd_opts.plugin_args[pluginName][k3];
			}
		}
	}
    }

    /**
     * Make common interface
     * @param {object} globals Parameters of various objects
     * @param {string} pluginName The name of plugin
     * @param {Array.<string>} role The roles of plugin
     * @param {string} storagePath Data storage path
     */
    makeCommon(globals, pluginName, role, storagePath) {
        this.log = (...args) => {
            args.unshift(`${pluginName} plugin>`);
            process.stdout.write((new Date()).toLocaleTimeString()+': ');
            console.log(...args);
        };
        const pt = this.constructor.getLocalStoragePath(storagePath);
        this.localStorage = new QuotaLocalStorage(pt);
        this.getMyID = function(){return globals.getMyID();};
    }

    /**
     * Get path for settings
     * @param {string} storagePath Data storage path
     * @return {string} path of localStorage
     */
    static getSettingsPath(storagePath) {
        return path.join(storagePath, 'settings.json');
    }

    /**
     * Get path for localStorage
     * @param {string} storagePath Data storage path
     * @return {string} path of localStorage
     */
    static getLocalStoragePath(storagePath) {
        const pt = path.join(storagePath, 'local-storage');
        if (!fs.existsSync(pt)) {
            fs.mkdirsSync(pt);
        }
        return pt;
    }
};
