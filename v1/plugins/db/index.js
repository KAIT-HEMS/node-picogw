var fs = require('fs');
const pathm = require('path');
const LocalStorage = require('node-localstorage').LocalStorage;
const MYPATH  = __filename.split(pathm.sep).slice(0,-1).join('/') ;
const DATAPATH = MYPATH+'/data' ;
const localStorage = new LocalStorage( DATAPATH ) ;

let pluginInterface ;
let log = console.log ;

exports.init = function(pi){
	pluginInterface = pi ;
	log = pi.log ;

	//pi.on('SettingsUpdated' , newSettings =>{} ) ;

	return onProcCall ;
} ;

function onProcCall( method , path , args ){
	let re ;
	switch(method){
	case 'GET' :
		if (path==''){	// Request for members
			try {
				fs.statSync( DATAPATH ) ;
				return new Promise( (rslv,rjct)=>{
					fs.readdir( DATAPATH, (err, files) => {
						re = {} ;
						files.forEach(fname => {
							try {
								let fo = fs.lstatSync(`${DATAPATH}/${fname}`) ;
								if( fo.isDirectory() ) return ;
							} catch(e){ return ; }

							let fname_mid = decodeURIComponent(fname) ;
							fname = decodeURIComponent(fname_mid) ;
							re[fname] = {} ;
							if( args && args.option === 'true' ){
								let gi = localStorage.getItem(fname_mid);
								re[fname].option = {
									doc : {
										short : localStorage.getItem(fname_mid).length+' byte'
										//,long : 'Optional long message'
									}
									, leaf : true
								} ;
							}
						}) ;
						rslv(re) ;
					} ) ;
				} ) ;
			} catch(e){
				return {error:'Error in accessing '+DATAPATH} ;
			}
		}
		re = localStorage.getItem(path) ;
		return ( re == null ? {error:'No such path:'+path} : JSON.parse(re) ) ;
	case 'POST' :
	case 'PUT' :
		try {
			localStorage.setItem(path,JSON.stringify( args )) ;
			pluginInterface.publish(path,args) ;	// PubSub
			return {success:true} ;
		} catch(e){
			return {error:'Data should be in JSON format.'} ;
		}
	case 'DELETE' :
		if(path == "" )	localStorage.clear() ;
		else			localStorage.removeItem(path) ;
		pluginInterface.publish(path,{}) ;	// PubSub
		return {success:true} ;
	default :
		return {error:`The specified method ${method} is not implemented in admin plugin.`} ;
	}
}