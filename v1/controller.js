"use strict";

const VERSION = 'v1';
const CALL_TIMEOUT = 60*1000 ;

var fs = require('fs');

var PluginInterface = require('./PluginInterface.js').PluginInterface ;

var log = console.log ;
var admin ;

var globals ;
var Plugins = {} ;
exports.init = function(_globals /*,clientFactory*/){
	globals = _globals ;
	return new Promise( function(ac,rj){
		// Scan plugins
		const PLUGINS_FOLDER = './'+VERSION+'/plugins/' ;
		try {
			fs.statSync( PLUGINS_FOLDER ) ;
			fs.readdir( PLUGINS_FOLDER, (err, files) => {
				if (err){ rj('No plugin folder found.'); return; }

				// Admin plugin should be initialized first.
				var plugin_names = ['admin'] ;

				files.filter(dirname => {
					var fo = fs.lstatSync(PLUGINS_FOLDER + dirname) ;
					return fo.isDirectory() || fo.isSymbolicLink();
				}).forEach(dirname => {
					if( dirname == 'admin') return ;
					plugin_names.push(dirname) ;
		   	 	}) ;
		   	 	log('Plugins registeration started.') ;
		   	 	function registerplugin(){
		   	 		var plugin_name = plugin_names.shift() ;
					var pc = new PluginInterface(
						{VERSION:VERSION,admin:admin,PubSub:globals.PubSub}
						,plugin_name) ;
					var exportmethods = {} ;
					[ 'publish','log','on','off'
						,'getMACFromIPv4Address','setNetCallbacks','getMACs'
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

					try {
						var pobj = require('./plugins/' + plugin_name + '/index.js') ;
						// Plugin init must return procedure call callback function.
						Promise.all([pobj.init(exportmethods)]).then( p => {
							pc.procCallback = p[0] ;

							Plugins[plugin_name] = pc ;
							if( plugin_name === 'admin' )	admin = pobj ;
							log(plugin_name+' plugin initiaized') ;
				   	 		if( plugin_names.length == 0 ){ac('All plugins initialization process is ended.'); return;}
				   	 		registerplugin() ;
						}).catch(e=>{
							log(plugin_name+' plugin could not be initiaized') ;
				   	 		if( plugin_names.length == 0 ){ac('All plugins initialization process is ended.'); return;}
				   	 		registerplugin() ;
						}) ;

					} catch (e){log('Error in initializing '+plugin_name+' plugin: '+JSON.stringify(e)) ;}
				}
	   	 		registerplugin() ;
			}) ;
		} catch(e){
			rj('No plugins exists.') ;
		}
	}) ;
} ;

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