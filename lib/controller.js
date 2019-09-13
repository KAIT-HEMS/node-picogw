'use strict';

const CALL_TIMEOUT = 60*1000;
const ROLE = {
    SERVER: 'server',
    CLIENT: 'client',
    HTTP: 'http',
};
module.exports.ROLE = ROLE;

const SUPPORTED_VERSIONS = ['v1'];
const DEFAULT_PLUGIN_NAMES = ['admin', 'web'];
// const DEFAULT_PLUGIN_NAMES = ['admin', 'web' , 'echonet'];

const fs = require('fs');
const path = require('path');
const httpServer = require('./http-server');
const mqttClient = require('./mqtt-client');
const pluginLoader = require('./plugin-loader');
const PluginInterface = require('./plugin-interface').PluginInterface;
const genCryptFunctions = require('./plugin-interface-crypt').genCryptFunctions;
const Config = require('./config');

let log = console.log;

let globals;
let Plugins = {};
let config;

/**
 * initialize controller
 * @param {object} _globals Parameters of various objects
 * @return {object} successful message
 */
module.exports.init = async function(_globals) {
    globals = _globals;
    globals.callProc = callProc;
    config = loadConfig(globals);
    globals.config = config;

    const [plugs] = await Promise.all([
        listPlugins(), genCryptKey(globals)]);

    // Admin plugin should be initialized first
    await registerPlugin(plugs.shift());
    startHttpServer();

    // Initialize plugins
    await Promise.all(plugs.map((plug) => {
        registerPlugin(plug);
    }));
    httpServer.applyEndpoints();

    startMqttServer();

    // Import initialized plugins
    await Promise.all(Object.keys(Plugins).map((pluginName) => {
        const plugin = Plugins[pluginName];
        if (plugin.imports.onPluginsInitialized) {
            plugin.imports.onPluginsInitialized();
        }
    }));


    // Check myID for console display
    function showMyID(){
        let myID = globals.admin.getMyID();
        if( myID == null ) setTimeout(showMyID,1000);
        else log(`My ID is \u001b[31m${myID}\u001b[0m`);
    }
    showMyID();


    globals.admin.startCheckingArpTable();

    return 'All plugins initialization process is ended.';
};

// eslint-disable-next-line require-jsdoc
function loadConfig(globals) {
    const cmdOpts = globals.cmd_opts;
    const confFile = cmdOpts.get('config');
    return new Config(confFile);
}


// eslint-disable-next-line require-jsdoc
async function listPlugins() {
    let plugs = await pluginLoader.list();
    plugs = sortPlugins(plugs);
    log('Plugins registeration started.');
    return plugs;
}

// eslint-disable-next-line require-jsdoc
async function genCryptKey(globals) {
    const funcs = genCryptFunctions(getStoragePath());
    globals.getPubKey = funcs.getPubKey;
    globals.encrypt = funcs.encrypt;
    globals.decrypt = funcs.decrypt;
}

// eslint-disable-next-line require-jsdoc
async function startHttpServer() {
    const adminLocalStorage = Plugins.admin.pi.localStorage;
    const port = globals.cmd_opts.get('port') ||
        adminLocalStorage.getItem('PORT_NUM') || 8080;
    httpServer.init({callProc: callProc, PubSub: globals.PubSub});
    httpServer.start(port);

    globals.PubSub.sub('/v1/admin/client_settings', (re)=>{
        const cs = re['/v1/admin/client_settings'];
        if (cs.port != null && cs.port != port) {
            adminLocalStorage.setItem('PORT_NUM', cs.port);
            httpServer.restart(cs.port);
        }
    });
}

// eslint-disable-next-line require-jsdoc
async function startMqttServer() {
    const adminLocalStorage = Plugins.admin.pi.localStorage;
    mqttClient.init(globals,adminLocalStorage);

    const mqttSettings = adminLocalStorage.getItem('MQTT_SETTINGS');

    let myid = globals.admin.getMyID();
    if( mqttSettings != null ){
        if( myid != null )
            mqttSettings.myid = myid;
        mqttClient.setupServerConnection(mqttSettings);
    }

    globals.PubSub.sub('/v1/admin/client_settings', (re)=>{
        const cs = re['/v1/admin/client_settings'];
        if (cs.mqtt == null ) return;
        if( myid == null ){
	    myid = globals.admin.getMyID();
            if( myid == null ) // No proper myid found
                return ;
        }

        let mqttSettings = Object.assign({}, cs.mqtt);
        mqttSettings.myid = myid;
        adminLocalStorage.setItem('MQTT_SETTINGS', mqttSettings);
        mqttClient.setupServerConnection(mqttSettings);
    });
}

// eslint-disable-next-line require-jsdoc
function sortPlugins(plugs) {
    return plugs.sort((a, b) => {
        if (a.name === b.name) {
            return 0;
        } else if (a.name === 'admin' && b.name !== 'admin') {
            return -1;
        } else if (a.name !== 'admin' && b.name === 'admin') {
            return 1;
        } else if (a.name > b.name) {
            return 1;
        } else {
            return -1;
        }
    });
}

// eslint-disable-next-line require-jsdoc
async function registerPlugin(plug) {
    const pluginName = plug.name;
    let modulePath;
    let pobj;

    try {
        const requirePath = plug.requirePath;
        modulePath = require.resolve(requirePath);
        pobj = require(requirePath);
    } catch (e) {
        log('failed to require plugin.', pluginName);
        console.error(e);
        return;
    }

    try {
        return registerPluginInterface(
            pobj, pluginName, plug.role, modulePath);
    } catch (e) {
        console.error(e);
    }
}

// eslint-disable-next-line require-jsdoc
async function registerPluginInterface(
    pobj, pluginName, role, modulePath) {
    const isDefaultPlugin = DEFAULT_PLUGIN_NAMES.includes(pluginName);
    const pluginStoragePath = getPluginStoragePath(pluginName);
    const pi = new PluginInterface(
        globals, pluginName, role, modulePath,
        pluginStoragePath, isDefaultPlugin);
    const imports = {};

    if (typeof pobj.init === 'function') {
        // async function initPlugin(pobj) {
        const initPlugin = async (pobj) => {
            return pobj.init(pi);
        };
        await initPlugin(pobj).catch((e) =>{
            log(pluginName+' plugin could not be initiaized');
            log(e);
        });

        if (role.includes(ROLE.SERVER)) {
            if (typeof pobj.onCall !== 'function') {
                const msg = `The '${pluginName}' plugin for role 'server' `
                    + 'needs to export onCall(method, path, args, transport, files).';
                throw new Error(msg);
            }
            imports.onCall = pobj.onCall;
        }
        imports.onPluginsInitialized = pobj.onPluginsInitialized;
        if (pobj.onUIGetSettingsSchema) {
            pi.setting.onUIGetSettingsSchema = pobj.onUIGetSettingsSchema;
        }
        if (pobj.onUIGetSettings) {
            pi.setting.onUIGetSettings = pobj.onUIGetSettings;
        }
        if (pobj.onUISetSettings) {
            pi.setting.onUISetSettings = pobj.onUISetSettings;
        }
    }
    Plugins[pluginName] = {pi, imports, role};
    if (pluginName === 'admin') {
        globals.admin = pobj;
    }
    log(pluginName + ' plugin initiaized');
}

/**
 * Caller of plugin's onCall handled by server role
 * @param {object} params The parameters of callProc include method, path and args
 * @return {Promise} Promise object that handles callProc
 */
function callProc(params) {
    if (params.args != undefined &&
        typeof params.args.encrypted == 'string') {
        const plain = globals.decrypt(params.args.encrypted);
        try {
            params.args = JSON.parse(plain);
        } catch (e) {
            return Promise.reject({errors:[{message:'Invalid JSON',error:e}]});
        }
    }
    try {
        params = normalizeParams(params);
    } catch (e) {
        return Promise.reject(e);
    }
    const method = params.method;
    const procedure = params.path;
    const args = params.args;
    const transport = params.transport;
    const files = params.files;
    const source = params.source;
    const timeout = params.timeout;
    return new Promise((ac, rj) => {
        try {
            if (procedure.length == 0) { // access for '/v1/' => plugin list
                const ps = {};
                const prms = [];
                const prmsPrfx = [];
                for (let [prfx, plugin] of Object.entries(Plugins)) {
                    if (!plugin.role.includes(ROLE.SERVER)) {
                        continue;
                    }
                    const pi = plugin.pi;
                    const imports = plugin.imports;
                    ps[prfx] = {
                        callable: (typeof imports.onCall === 'function'),
                    };
                    if (args.info === 'true') {
                        prms.push(pi.setting._getUISettingsSchema());
                        prmsPrfx.push(prfx);
                        prms.push(pi.setting._getUISettings());
                        prmsPrfx.push(prfx);
                        ps[prfx]._info = {
                            leaf: false,
                            // ,doc:{short:'Plugin'}
                            // ,settings_schema : .. , settings : .. (set later)
                        };
                    }
                }
                if (prms.length == 0) ac(ps);
                else {
                    Promise.all(prms).then((re)=>{
                        for (let pi=0; pi<re.length; ++pi) {
                            const s = ps[prmsPrfx[pi]];
                            if (pi%2 == 0) s._info.settings_schema = re[pi];
                            else s._info.settings = re[pi];
                        }
                        ac(ps);
                    }).catch(rj);
                }
                return;
            }
            let terms = procedure.split('/');
            while (terms[terms.length-1]=='') terms.pop();
            const pprefix = terms[0];
            const ppath = terms.slice(1).join('/');// pdevid = terms[1] , ppropname = terms.slice(2).join('/') ;
            // var pprefix = terms[0] , pdevid = terms[1] , ppropname = terms.slice(2).join('/') ;

            if( Plugins[pprefix] == null ){
                ac({success: false, errors:[{error:'No plugin named "'+pprefix+'"'}]});
                return;
            }

            // Update settings.json
            if (method === 'POST' && ppath.indexOf('settings')==0) {
                //              && pdevid === 'settings'
                //              && (ppropname == undefined || ppropname == '') ){

                Plugins[pprefix].pi.setting._setSettings(args).then((re) => {
                    const msg = 'settings.json was successfully updated.';
                    ac({success: true, message: msg, result: re});
                }).catch((e) => {
                    ac({error: e.toString()});
                });
                return;
            }
            let proccallback = Plugins[pprefix].imports.onCall;
            if (typeof proccallback == 'function') {
                let bReplied = false;
                Promise.all([proccallback(method, ppath, args, transport, files, source)])
                    .then((re)=>{
                        if (!bReplied) {
                            bReplied = true; ac(re[0]);
                        }
                    }).catch((re)=>{
                        if (!bReplied) {
                            bReplied = true; ac(re);
                        }
                    });
                    setTimeout(()=>{
                        if (!bReplied) {
                            bReplied = true;
                            ac({error: `GET request timeout:${ppath}`});
                        }
                    } , timeout || CALL_TIMEOUT);
            } else {
                const msg = 'Procedure callback is not defined for the plugin ';
                ac({error: msg + pprefix});
            }
        } catch (e) {
            rj({error: 'Invalidly formatted procedure: ' + procedure});
            log(e);
        } ;
    });
} ;

// eslint-disable-next-line require-jsdoc
function normalizeParams(params) {
    const pathsplit = params.path.split('/');
    const ret = {
	method: params.method.toUpperCase(),
	args: params.args,
	transport: params.transport,
	files: params.files,
	source: params.source,
	timeout: params.timeout,
    };

    if (!SUPPORTED_VERSIONS.includes(pathsplit[1])) {
        throw new Error({error: `No such version: ${pathsplit[1]}`});
    }

    if (ret.args == undefined) {
        ret.args = {};
    } else if (typeof ret.args.encrypted == 'string') {
        ret.args = JSON.parse(globals.decrypt(ret.args.encrypted));
    }

    ret.path = params.path.slice(`/${pathsplit[1]}/`.length);
    return ret;
}

// eslint-disable-next-line require-jsdoc
function getStoragePath() {
    const pt = config.storagePath;
    if (!fs.existsSync(pt)) {
        fs.mkdirSync(pt);
    }
    return pt;
}

// eslint-disable-next-line require-jsdoc
function getPluginStoragePath(pluginName) {
    const pt = path.join(getStoragePath(), pluginName);
    if (!fs.existsSync(pt)) {
        fs.mkdirSync(pt);
    }
    return pt;
}

