"use strict";

const CALL_TIMEOUT = 60*1000 ;
const ROLE = {
    SERVER : 'server',
    CLIENT : 'client',
    HTTP : 'http',
};
module.exports.ROLE = ROLE;

const SUPPORTED_VERSIONS = ['v1'];

var fs = require('fs');
const pluginLoader = require('./plugin-loader');
const PluginInterface = require('./plugin-interface').PluginInterface;
const genCryptFunctions = require('./plugin-interface-crypt').genCryptFunctions;

var log = console.log;

var globals;
var Plugins = {};

module.exports.init = async function(_globals){
	globals = _globals;
    globals.callProc = callProc;

    const [plugs, _] = await Promise.all([
        listPlugins(), genCryptKey(globals)]);

    // Admin plugin should be initialized first
    await registerPlugin(plugs.shift());
    await Promise.all(plugs.map((plug) => {
        registerPlugin(plug);
    }));
    return 'All plugins initialization process is ended.';
}

async function listPlugins() {
    let plugs = await pluginLoader.list();
    plugs = sortPlugins(plugs);
    log('Plugins registeration started.');
    return plugs;
}

async function genCryptKey(globals) {
    const funcs = genCryptFunctions();
    globals.getPubKey = funcs.getPubKey;
    globals.encrypt = funcs.encrypt;
    globals.decrypt = funcs.decrypt;
}


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

async function registerPlugin(plug){
    const pluginName = plug.name;
    let modulePath;
    let pobj;

    try {
        const requirePath = plug.requirePath;
        modulePath = require.resolve(requirePath);
        pobj = require(requirePath);
    } catch(e) {
        console.log('failed to require plugin.', pluginName);
        console.error(e);
        return;
    }

    try {
        return registerPluginInterface(pobj, pluginName, plug.role, modulePath, plug.legacy);
    } catch(e) {
        console.error(e)
    }
}

async function registerPluginInterface(pobj, pluginName, role, modulePath, legacy) {
    const pi = new PluginInterface(globals, pluginName, role, modulePath, legacy);

    if (typeof pobj.init === 'function') {
        // TODO: delete below line as soon as the migration of the new plugin architecture is completed.
        const ret =
        await initPlugin(pobj).catch((e) =>{
            log(pluginName+' plugin could not be initiaized') ;
            log(e);
        });

        // the this codes as soon as migration of the new plugin architecture is completed.
        if (legacy) {
            if (typeof ret === 'function') {
                pi.server.onCall = ret;
            }
        }
    }
    Plugins[pluginName] = pi;
    if (pluginName === 'admin') {
        globals.admin = pobj;
    }
    log(pluginName + ' plugin initiaized');

    async function initPlugin(pobj) {
        return pobj.init(pi);
    }
}

function callProc(params){
    try {
        params = normalizeParams(params);
    } catch(e) {
        return Promise.reject(e);
    }
	const method = params.method;
    const procedure = params.path;
    const args = params.args;
	return new Promise( (ac,rj)=>{
		try {
			if( procedure.length == 0 ){ // access for '/v1/' => plugin list
				let ps = {} ;
				let prms = [] , prms_prfx = [] ;
				for( let prfx in Plugins ){
					let plugin = Plugins[prfx] ;
					ps[prfx] = {
						callable: (plugin.server && typeof plugin.server.onCall === 'function')
					} ;
					if( args.option === 'true'){
						prms.push(plugin.setting._getSettingsSchema()) ;
						prms_prfx.push(prfx) ;
						prms.push(plugin.setting.getSettings()) ;
						prms_prfx.push(prfx) ;
						ps[prfx].option = {
							leaf:false
							//,doc:{short:'Plugin'}
							//,settings_schema : .. , settings : .. (set later)
						} ;
					}
				}
				if( prms.length == 0 )	ac(ps) ;
				else Promise.all(prms).then(re=>{
					for( let pi=0;pi<re.length;++pi ){
						if( pi%2 == 0 )	ps[prms_prfx[pi]].option.settings_schema = re[pi] ;
						else			ps[prms_prfx[pi]].option.settings = re[pi] ;
					}
					ac(ps) ;
				}).catch(rj) ;
				return ;
			}
			let terms = procedure.split('/') ;
			while(terms[terms.length-1]=='') terms.pop() ;
			let pprefix = terms[0] , ppath = terms.slice(1).join('/');//pdevid = terms[1] , ppropname = terms.slice(2).join('/') ;
			//var pprefix = terms[0] , pdevid = terms[1] , ppropname = terms.slice(2).join('/') ;

			// Update settings.json
			if( method === 'POST' && Plugins[pprefix] != undefined
				&& ppath.indexOf('settings')==0 ){
//				&& pdevid === 'settings'
//				&& (ppropname == undefined || ppropname == '') ){

                Plugins[pprefix].setting._setSettings(args).then(re => {
					ac({success:true,message:'settings.json was successfully updated.',result:re});
                }).catch(e => {
					rj({error:e.toString()}) ;
                });
				return ;
			}
			let proccallback = Plugins[pprefix].server.onCall;
			if( typeof proccallback == 'function'){
				let bReplied = false ;
				Promise.all([proccallback(method,ppath /*pdevid,ppropname*/,args)])
					.then(re=>{
                        if( !bReplied ){ bReplied = true ; ac(re[0]); }
                    }).catch(re=>{
                        if( !bReplied ){ bReplied = true ; rj(re); }
                    });
				setTimeout(()=>{if( !bReplied ){ bReplied = true ; rj({error:`GET request timeout:${ppath}`})}}
					,CALL_TIMEOUT) ;
			} else rj({error:'Procedure callback is not defined for the plugin '+pprefix}) ;
		} catch(e){
			rj({error:'Invalidly formatted procedure: ' + procedure});
            log(e);
		} ;
	}) ;
} ;

function normalizeParams(params) {
    const pathsplit = params.path.split('/');
    const ret = {method: params.method.toUpperCase(), args: params.args};

    if (!SUPPORTED_VERSIONS.includes(pathsplit[1])) {
        throw {error:`No such version: ${pathsplit[1]}`};
    }

	if (ret.args == undefined) {
        ret.args = {};
    } else if (typeof ret.args.encrypted == 'string') {
        ret.args = JSON.parse(globals.decrypt(ret.args.encrypted));
    }

    ret.path = params.path.slice(`/${pathsplit[1]}/`.length);
    return ret;
}
