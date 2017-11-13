// Plugin interface that is passed to each plugin constructor
"use strict";

var fs = require('fs');
let SingleFileLocalStorage = require('../MyLocalStorage.js').SingleFileLocalStorage ;

var globals = {} ;	// VERSION, admin, PubSub
exports.PluginInterface = class {
	constructor ( _globals,prefix ) {
		globals = _globals ;
	    this.prefix = prefix ;
	    this.log = (msg) => { console.log(`${this.prefix} plugin> ${msg}`); };

	    this.localStorage = new SingleFileLocalStorage(this.getpath()+'localstorage.json') ;
	    this.localSettings = new SingleFileLocalStorage(this.getpath()+'settings.json') ;

	    //These can return Promise, but never call reject().
		this.getSettingsSchema = ()=>{ try {
   			return JSON.parse(fs.readFileSync(this.getpath()+'settings_schema.json').toString()) ;
   		} catch(e){} } ;
		this.getSettings = ()=>{ try {
   			return JSON.parse(fs.readFileSync(this.getpath()+'settings.json').toString()) ;
   		} catch(e){} } ;

   		
	    this.onSettingsUpdated = newsettings=>{} ;
   	}
	setOnGetSettingsSchemaCallback(callback){ this.getSettingsSchema = callback ; }
	setOnGetSettingsCallback(callback){ this.getSettings = callback ; }
	setOnSettingsUpdatedCallback(callback){ this.onSettingsUpdated = callback ; }

	publish ( topicname, args) {
		var path ;
		if( topicname==null || topicname==='')
			path = `/${globals.VERSION}/${this.prefix}` ;
		else {
			if( topicname.slice(-1)=='/') topicname=topicname.slice(0,-1) ;
			path = `/${globals.VERSION}/${this.prefix}/${topicname}` ;
		}

		var re = {method:'PUB'} ;
		//var path = `/${globals.VERSION}/${this.prefix}/${devid}/${topicname}` ;
		re[path] = args ;
		globals.PubSub.pub(path,re /*{method:'PUB',path:path,args:args}*/) ;
	}

	// Returns promise
	getMACFromIPv4Address (net,ip,bSearch) {
		if( this.prefix == 'admin')
			return Promise.reject('Cannot call getMacFromIPv4Address from admin plugin') ;
		return globals.admin.getMACFromIPv4Address_Forward(net,ip,bSearch) ;
	}

	// callbacks_obj can contain the following four members
	// onMacFoundCallback	: function(net,newmac,newip) ;
	// onMacLostCallback	: function(net,lostmac,lostip) ;
	// onIPChangedCallback	: function(net,mac,oldip,newip) ;
	setNetCallbacks (callbacks_obj) {
		globals.admin.setNetCallbacks_Forward(this.prefix , callbacks_obj) ;
	}

	// If the argument is true, returns only self macs.
	// Otherwise, returns all macs recognized
	getMACs (bSelfOnly) {
		return globals.admin.getMACs(bSelfOnly) ;
	}


	getPubKey(){ return globals.getPubKey() ; }
	encrypt(str){ return globals.encrypt(str) ; }
	decrypt(str){ return globals.decrypt(str) ; }
	// handlerName = 'SettingsUpdated', etc...
	on(handlerName,handler_body){ this['on'+handlerName] = handler_body ; }
	off(handlerName){ delete this['on'+handlerName] ; this['on'+handlerName] = undefined ;}
	// Get plugin home dir
	getpath(){ return `${globals.VERSION}/plugins/${this.prefix}/` ; }

	getprefix (){ return this.prefix; }
} ;