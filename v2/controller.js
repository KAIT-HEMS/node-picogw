"use strict";

const VERSION = 'v2';
const fs = require('fs');
const child_process = require('child_process') ;
const CALL_TIMEOUT = 30*1000 ;
//const SingleFileLocalStorage = require('../MyLocalStorage.js').SingleFileLocalStorage ;

const PIPE_NAME = {
	read:'v2/pipe_r'
	,write:'v2/pipe_w'
} ;


let globals,clientFactory ;

let log = msg=>{ console.log('v2API: '+msg); } ;

let reqid = 1 ;
let reply_waitlist = {} ;

exports.init = function(_globals,_clientFactory){
	globals = _globals ;
	clientFactory = _clientFactory ;

	return new Promise((ac,rj)=>{
		Promise.all([
			new Promise((ac2,rj2)=>{fs.exists(PIPE_NAME.read,exists=>{if(exists) ac2(); else rj2();})})
			,new Promise((ac2,rj2)=>{fs.exists(PIPE_NAME.write,exists=>{if(exists) ac2(); else rj2();})})
		]).then(()=>{

			let node_red_process ;
			let wstream ;

			function kill_node_red(e){
				if( e ){ log('Connection error: '+JSON.stringify(e)) };
				log('Killing Node-RED. v2 API will be disabled.') ;
				node_red_process.kill('SIGHUP') ;
				node_red_process = null ;
			}
			Promise.all([
				// Boot Node-RED and display messages
				new Promise((ac2,rj2)=>{
					function node_red_log(msgs){
						if( typeof(msgs) != 'string' ) msgs = msgs.toString();
						msgs.split('\n').forEach(msg=>console.log('Node-RED: '+msg))
					} ;

					node_red_process = child_process.spawn( 'node',['node_modules/node-red/red.js','local-npm/node-red-contrib-picogw/flows/PicoGW_V2API.json'] ) ;
					node_red_process.stdout.on('data',data=>{
						node_red_log(data) ;
						ac2() ;
					}) ;
					node_red_process.stderr.on('data',data=>{
						node_red_log(data) ;
						rj2() ;
					}) ;
				})
				// Open read stream
				,new Promise((ac2,rj2)=>{
					let rstream = fs.createReadStream(PIPE_NAME.read, 'utf-8');
					rstream.on('error',e=>{
						kill_node_red(e) ;
						rj2() ;
					});
					rstream.on('open', ()=>{
						ac2() ;
					});
					rstream.on('close', ()=>{
						kill_node_red() ;
						rj2() ;
					});

					var readbuf = '' ;
					rstream.on('data', data=>{
						readbuf += data ;

						var ri = readbuf.lastIndexOf("\n") ;
						if( ri<0 ) return ;
						var focus = readbuf.slice(0,ri) ;
						readbuf = readbuf.slice(ri+1) ;

						//log('onData:'+focus) ;

						try {
							focus = JSON.parse(focus) ;
							let path ;
							for( let k in focus )
								if( k.charAt(0)=='/'){
									path = k ; break ;
								}

							if( reply_waitlist[focus.reqid] != null){
								const reqid = focus.reqid ;
								delete focus.reqid ;
								reply_waitlist[reqid](focus) ;
								delete reply_waitlist[reqid] ;
							} else if(focus.method=='PUB'){
								let rep = { method:'PUB' } ;

								globals.PubSub.pub(path,focus) 
							}
						} catch(e){}
					});
				})

				// Open write stream
				,new Promise((ac2,rj2)=>{
					// Write stream setup
					wstream = fs.createWriteStream(PIPE_NAME.write, 'utf-8');
					wstream	.on('drain', ()=>{})
						.on('open',()=>{
							ac2() ;
						})
					    .on('error', e =>{ kill_node_red(e) ;})
					    .on('close', ()=>{ kill_node_red() ;})
				})
			]).then(()=>{
				log('Connected to Node-RED.');

				exports.callproc = function(params){
					return new Promise((ac,rj)=>{
						params.reqid = reqid++ ;

						wstream.write( JSON.stringify( params )+'\n' ) ;
						reply_waitlist[params.reqid] = ac ;
						setTimeout(()=>{
							if( reply_waitlist[params.reqid] == null ) return ;
							reply_waitlist[params.reqid]({error:'Timeout'}) ;
							delete reply_waitlist[params.reqid] ;
						},CALL_TIMEOUT) ;
					}) ;
				} ;




			}).catch(()=>{
				log('Error in connecting node-red. v2 API is disabled.') ;
				if( node_red_process != null )
					node_red_process.kill('SIGHUP') ;
				node_red_process = null ;
				rj();
			}) ;
		}).catch(()=>{
			log( 'v2 API is disabled.' ) ;
			rj();
		});
	}) ;
} ;


/*

// Alias

const MYPATH = __filename.split('/').slice(0,-1).join('/')+'/' ;
const LOCAL_STORAGE_PATH = MYPATH+'localstorage.json' ;
let localStorage = new SingleFileLocalStorage(LOCAL_STORAGE_PATH) ;

const SPECIAL_PATHS = {
	'function/alias' : params => {
		let aliases = localStorage.getItem('aliases',{}) ;
		let path = params.path.slice('function/alias'.length+1) ;
		let ret = {} ;
		switch(params.method){
		case 'GET' :
			ret = localStorage.getItem('aliases',{}) ;
			break ;
		case 'POST' : // Newly create a new alias
			if( path.length==0 )
				ret = {error:'No alias name is specified for creation.'} ;
			else if( params.args.path == undefined )
				ret = {error:'No path name is specified for alias creation.'} ;
			else if( aliases[path] != undefined )
				ret = {error:`The alias ${path} already exists.`} ;
			else {
				aliases[path] = params.args.path ;
				localStorage.setItem('aliases',aliases) ;
				ret = {success:true,message:`Alias ${path} is successfully associated with the path ${params.args.path}`} ;
			}
			break ;
		case 'PUT' : // Replace an existing alias
			if( path.length==0 )
				ret = {error:'No alias name is specified for replacement.'} ;
			else if( params.args.path == undefined )
				ret = {error:'No path name is specified for alias replacement.'} ;
			else if( aliases[path] == null )
				ret = {error:`The alias ${path} does not exist.`} ;
			else {
				aliases[path] = params.args.path ;
				localStorage.setItem('aliases',aliases) ;

				ret = {success:true,message:`Alias ${path} is successfully updated with the path ${params.args.path}`} ;
			}
			break ;
		case 'DELETE' : // Replace an existing alias
			if( path.length==0 )
				ret = {error:'No alias name is specified for deletion.'} ;
			else if( aliases[path] == undefined )
				ret = {error:`Alias name ${path} does not exist.`} ;
			else {
				delete aliases[path] ;
				localStorage.setItem('aliases',aliases) ;

				ret = {success:true,message:`Alias ${path} was successfully removed`} ;
			}
			break ;
		default :
			ret = {error:`Unknown method ${params.method} for alias setting.`} ;
		}
		return Promise.resolve(ret) ;
	}
	, 'function' : params => {
		if( params.method == 'GET' ){
			let re = {} ;
			for( let sp in SPECIAL_PATHS )
				if( sp.indexOf('function/')==0 ){
					let cp = sp.slice('function/'.length) ;
					if( cp.indexOf('/')<0 )
						re[cp] = {} ;
				}
			return Promise.resolve(re) ;
		}
		return Promise.resolve({error:`The method ${params.method} is not supported.`}) ;
	}
}
*/