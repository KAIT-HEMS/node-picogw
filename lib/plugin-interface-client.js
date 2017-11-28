// Client interface that is passed to each client constructor
"use strict";

module.exports = class {

	constructor(globals) {
        this.globals = globals;
	    this.subscriptions = {} ;
	}

	// method:	GET/PUT that go directly to the plugin
	callProc ( params ){
        if( params.args != undefined && typeof params.args.encrypted == 'string' )
        	params.args = JSON.parse(this.globals.decrypt(params.args.encrypted)) ;
        return this.globals.callProc({
			method: params.method,
			path: params.path,
			args: params.args,
        });
	}

	subscribe (topicname,callback){
		if( topicname.slice(-1)=='/') topicname=topicname.slice(0,-1) ;
		if( this.subscriptions[topicname] == undefined )
			this.subscriptions[topicname] = [] ;
		if( this.subscriptions[topicname].indexOf(callback)>=0 )
			return ;	// Cannot subscribe multiple times
		this.globals.PubSub.sub(topicname,callback) ;
		this.subscriptions[topicname].push(callback) ;
	}
	unsubscribe (topicname,callback){
		this.globals.PubSub.unsub(topicname,callback) ;
		if( this.subscriptions[topicname] == undefined
			|| this.subscriptions[topicname].indexOf(callback) < 0 )
			return ;	// Should never happen
		this.subscriptions[topicname]
			= this.subscriptions[topicname].filter(f=>f!=callback) ;
		if( this.subscriptions[topicname].length == 0)
			delete this.subscriptions[topicname] ;
	}
	// Topicname can be undefined to remove all subscriptions of this client.
    // TODO:Delete this function and merge unsubscribe(topicname==null)
	unsubscribeall (topicname){
		if( topicname == undefined ){
			for( var tn in this.subscriptions )
				for( var cbi in this.subscriptions[tn] )
					this.globals.PubSub.unsub(tn,this.subscriptions[tn][cbi]) ;
			this.subscriptions = {} ;
		} else {
			for( var cbi in this.subscriptions[topicname] )
				this.globals.PubSub.unsub(topicname,this.subscriptions[topicname][cbi]) ;
			delete this.subscriptions[topicname] ;
		}
	}
} ;
