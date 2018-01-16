'use strict';

const CALL_TIMEOUT = 60*1000;
const ROLE = {
    SERVER: 'server',
    CLIENT: 'client',
    HTTP: 'http',
};
module.exports.ROLE = ROLE;

const SUPPORTED_VERSIONS = ['v1'];
const DEFAULT_PLUGIN_NAMES = ['admin', 'web', 'echonet'];

const fs = require('fs');
const path = require('path');
const httpServer = require('./http-server');
const pluginLoader = require('./plugin-loader');
const PluginInterface = require('./plugin-interface').PluginInterface;
const genCryptFunctions = require('./plugin-interface-crypt').genCryptFunctions;
const Setting = require('./setting');

let log = console.log;

let globals;
let Plugins = {};
let settings;

/**
 * initialize controller
 * @param {object} _globals Parameters of various objects
 * @return {object} successful message
 */
module.exports.init = async function(_globals) {
    globals = _globals;
    globals.callProc = callProc;
    settings = loadSettings(globals);

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

    // Initialize plugins
    await Promise.all(Object.keys(Plugins).map((pluginName) => {
        const plugin = Plugins[pluginName];
        if (plugin.imports.onPluginsInitialized) {
            plugin.imports.onPluginsInitialized();
        }
    }));
    globals.admin.startCheckingArpTable();
    return 'All plugins initialization process is ended.';
};

// eslint-disable-next-line require-jsdoc
function loadSettings(globals) {
    const cmdOpts = globals.cmd_opts;
    const confFile = cmdOpts.get('config');
    return new Setting(confFile);
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
    httpServer.start(port);
    addAPIEndpoint();

    // TODO:remover version '/v1'
    globals.PubSub.sub('/v1/admin/client_settings', (re)=>{
        const cs = re['/v1/admin/client_settings'];
        if (cs.port != null && cs.port != port) {
            adminLocalStorage.setItem('PORT_NUM', cs.port);
            port = cs.port;
            httpServer.restart();
        }
    });
}

// eslint-disable-next-line require-jsdoc
function addAPIEndpoint() {
    // REST API call
    const priority = 0; // 0 means most low priority
    httpServer.endpoint(priority, 'all', `/v*/*`, function(req, res, next) {
        // for( var e in req ){if( typeof req[e] == 'string') log(e+':'+req[e]);}
        // var caller_ip = req.ip ;
        let args = req.body;
        // Overwrite args in body with GET parameters
        if (req.originalUrl.indexOf('?') >= 0) {
            const pos = req.originalUrl.indexOf('?')+1;
            req.originalUrl.slice(pos).split('&').forEach((eq)=>{
                let terms = eq.split('=');
                if (terms[0] === 'callback' ||
                    terms[0] === 'jsoncallback') {
                    return;
                }
                if (terms.length === 1) {
                    args.value = decodeURIComponent(terms[0]);
                } else {
                    args[terms[0]] = decodeURIComponent(terms[1]);
                }
            });
        }

        // 多分常に文字列。JSONオブジェクトに変換できるときはオブジェクトに、数値に変換できる
        // 時は数値に、それ以外はそのまま文字列として、プラグインに与える。
        for (let k in args) {
            if (typeof args[k] == 'string') {
                try {
                    args[k] = JSON.parse(args[k]);
                } catch (e) {
                    if (isFinite(parseInt(args[k]))) {
                        args[k] = parseInt(args[k]);
                    }
                }
            }
        }
        callProc({method: req.method, path: req.path, args: args}).then((re)=>{
            res.jsonp(re);
        }).catch((e)=>{
            next();
            /* console.error*/
        });
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
        console.log('failed to require plugin.', pluginName);
        console.error(e);
        return;
    }

    try {
        return registerPluginInterface(
            pobj, pluginName, plug.role, modulePath, plug.legacy);
    } catch (e) {
        console.error(e);
    }
}

// eslint-disable-next-line require-jsdoc
async function registerPluginInterface(
    pobj, pluginName, role, modulePath, legacy) {
    const isDefaultPlugin = DEFAULT_PLUGIN_NAMES.includes(pluginName);
    const pluginStoragePath = getPluginStoragePath(pluginName);
    const pi = new PluginInterface(
        globals, pluginName, role, modulePath, legacy,
        pluginStoragePath, isDefaultPlugin);
    const imports = {};

    if (typeof pobj.init === 'function') {
        // async function initPlugin(pobj) {
        const initPlugin = async (pobj) => {
            return pobj.init(pi);
        };
        // TODO: delete 'ret' value as soon as the migration of
        // the new plugin architecture is completed.
        const ret = await initPlugin(pobj).catch((e) =>{
            log(pluginName+' plugin could not be initiaized');
            log(e);
        });

        // the this codes as soon as migration of the new plugin architecture is completed.
        if (legacy) {
            if (typeof ret === 'function') {
                pobj.onCall = ret;
            }
        }

        if (role.includes(ROLE.SERVER)) {
            if (typeof pobj.onCall !== 'function') {
                const msg = `The '${pluginName}' plugin for role 'server' `
                    + 'needs to export onCall(method, path, args).';
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
    try {
        params = normalizeParams(params);
    } catch (e) {
        return Promise.reject(e);
    }
    const method = params.method;
    const procedure = params.path;
    const args = params.args;
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
                    if (args.option === 'true') {
                        prms.push(pi.setting._getUISettingsSchema());
                        prmsPrfx.push(prfx);
                        prms.push(pi.setting._getUISettings());
                        prmsPrfx.push(prfx);
                        ps[prfx].option = {
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
                            if (pi%2 == 0) s.option.settings_schema = re[pi];
                            else s.option.settings = re[pi];
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

            // Update settings.json
            if (method === 'POST' && Plugins[pprefix] != undefined
                && ppath.indexOf('settings')==0) {
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
                Promise.all([proccallback(method, ppath, args)])
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
                }
                    , CALL_TIMEOUT);
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
    const ret = {method: params.method.toUpperCase(), args: params.args};

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
    const pt = settings.storagePath;
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

