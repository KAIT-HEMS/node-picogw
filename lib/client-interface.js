// Client interface that is passed to each client constructor
"use strict";

var globals = {} ;	// VERSION_CTRLS,PubSub

exports.ClientInterface = class {
	constructor ( _globals ) {
	    globals = _globals ;

	    this.log = (msg) => { console.log('client> '+msg); };
	    this.subscriptions = {} ;

	}
	// method:	GET/PUT that go directly to the plugin
	callproc ( params ){
		var pathsplit = params.path.split('/') ;

		if( globals.VERSION_CTRLS[pathsplit[1]] == undefined )
            return Promise.reject({error:`No such version: ${pathsplit[1]}`}) ;

        if( params.args != undefined && typeof params.args.encrypted == 'string' )
        	params.args = JSON.parse(globals.decrypt(params.args.encrypted)) ;

		return globals.VERSION_CTRLS[pathsplit[1]].callproc({
			method:params.method
			,path:params.path.slice( `/${pathsplit[1]}/`.length )
			,args:params.args
		}) ;
	}

	subscribe (topicname,callback){
		if( topicname.slice(-1)=='/') topicname=topicname.slice(0,-1) ;
		if( this.subscriptions[topicname] == undefined )
			this.subscriptions[topicname] = [] ;
		if( this.subscriptions[topicname].indexOf(callback)>=0 )
			return ;	// Cannot subscribe multiple times
		globals.PubSub.sub(topicname,callback) ;
		this.subscriptions[topicname].push(callback) ;
	}
	unsubscribe (topicname,callback){
		globals.PubSub.unsub(topicname,callback) ;
		if( this.subscriptions[topicname] == undefined
			|| this.subscriptions[topicname].indexOf(callback) < 0 )
			return ;	// Should never happen
		this.subscriptions[topicname]
			= this.subscriptions[topicname].filter(f=>f!=callback) ;
		if( this.subscriptions[topicname].length == 0)
			delete this.subscriptions[topicname] ;
	}
	// Topicname can be undefined to remove all subscriptions of this client.
	unsubscribeall (topicname){
		if( topicname == undefined ){
			for( var tn in this.subscriptions )
				for( var cbi in this.subscriptions[tn] )
					globals.PubSub.unsub(tn,this.subscriptions[tn][cbi]) ;
			this.subscriptions = {} ;
		} else {
			for( var cbi in this.subscriptions[topicname] )
				globals.PubSub.unsub(topicname,this.subscriptions[topicname][cbi]) ;
			delete this.subscriptions[topicname] ;
		}
	}
} ;
