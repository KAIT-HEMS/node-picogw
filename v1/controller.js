"use strict";

const CALL_TIMEOUT = 60*1000 ;

var fs = require('fs');
const pluginLoader = require('plugin-loader');

var PluginInterface = require('./PluginInterface.js').PluginInterface ;

var log = console.log ;
var admin ;

var globals ;
var Plugins = {} ;

exports.init = async function(_globals /*,clientFactory*/){
	globals = _globals;
    const plugs = await pluginLoader.list();
    log('Plugins registeration started.');
    // Admin plugin should be initialized first
    return registerplugin(plugs, 'admin');
}

async function registerplugin(plugs, pluginName){
    const requirePath = plugs.requirePath;
    delete plugs[pluginName];
	var pc = new PluginInterface(
		{VERSION:'v1', admin:admin, PubSub:globals.PubSub} // TODO:remove VERSION
		,pluginName) ;
	var exportmethods = {} ;
	[ 'publish','log','on','off','getNetIDFromIPv4Address','setNetIDCallbacks'
		,'getSettingsSchema','getSettings'
		,'setOnGetSettingsSchemaCallback','setOnGetSettingsCallback','setOnSettingsUpdatedCallback'
		,'getpath','getprefix']
		.forEach(methodname => {
		exportmethods[methodname] = function(){
			return pc[methodname].apply(pc,arguments);
		} ;
	}) ;
	exportmethods.localStorage = pc.localStorage ;
	exportmethods.localSettings = pc.localSettings ;

	var pobj = require(requirePath) ;
    const initPlugin = async function (pobj) {
	    return pobj.init(exportmethods);
    }
    return initPlugin(pobj, exportmethods).then( p => {
	    // Plugin init must return procedure call callback function.
		pc.procCallback = p;
		Plugins[pluginName] = pc ;
		if( pluginName === 'admin' )	admin = pobj ;
		log(pluginName+' plugin initiaized') ;
	}).catch(e=>{
		log(pluginName+' plugin could not be initiaized') ;
        log(e);
	}).then(() => {
        const names = Object.keys(plugs);
        if( names.length == 0 ){
            return 'All plugins initialization process is ended.';
        }
        return registerplugin(plugs, names[0]) ;
    });
}


exports.callproc = function(params){
	var method = params.method ;
	var procedure = params.path ;
	var args = params.args ;
	if(args==undefined) args={} ;

	return new Promise( (ac,rj)=>{
		try {
			if( procedure.length == 0 ){ // access for '/v1/' => plugin list
				let ps = {} ;
				let prms = [] , prms_prfx = [] ;
				for( let prfx in Plugins ){
					let plugin = Plugins[prfx] ;
					ps[prfx] = {
						path : plugin.getpath()
						, callable: (typeof plugin.procCallback == 'function')
					} ;
					if( args.option === 'true'){
						prms.push(plugin.getSettingsSchema()) ;
						prms_prfx.push(prfx) ;
						prms.push(plugin.getSettings()) ;
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

				Promise.all([Plugins[pprefix].onSettingsUpdated(args)]).then(re=>{
					fs.writeFile( Plugins[pprefix].getpath()+'settings.json'
						, JSON.stringify(args,null,"\t") , function(err){
							if( err ) rj({error:err}) ;
							else ac({success:true,message:'settings.json was successfully updated.',result:re[0]}) ;
						} ) ;
				}).catch(e=>{
					rj({error:e}) ;
				}) ;
				return ;
			}


			let proccallback = Plugins[pprefix].procCallback ;
			if( typeof proccallback == 'function'){

				let bReplied = false ;
				Promise.all([proccallback(method.toUpperCase(),ppath /*pdevid,ppropname*/,args)])
					.then(re=>{ if( !bReplied ){ bReplied = true ; ac(re[0]); } })
					.catch(re=>{ if( !bReplied ){ bReplied = true ; rj(re); } }) ;
				setTimeout(()=>{if( !bReplied ){ bReplied = true ; rj({error:`GET request timeout:${ppath}`})}}
					,CALL_TIMEOUT) ;
			} else rj({error:'Procedure callback is not defined for the plugin '+pprefix}) ;
		} catch(e){
			rj({error:'Invalidly formatted procedure: ' + procedure});
		} ;
	}) ;
} ;