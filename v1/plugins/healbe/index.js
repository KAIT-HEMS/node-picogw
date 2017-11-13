const fs = require('fs');
const https = require('https');
const url = require('url');

const REQ_TIMEOUT = 30*1000 ;
const HEALBE_BASE_URL = 'https://api.healbe.com/api' ;

const REQ_AUTH = 1 ;
const REQ_USER_ACTIVITY = 45 ;
const REQ_FULL_DAY_SUMMARY = 46 ;
const REQ_USER_EVENT = 47 ;
  const EVENT_SLEEP_MODULE_ID = 1024 ;
const REQ_SLEEP_INFO = 48 ;
const REQ_SLEEP_DETAILED_DATA = 73 ;
const REQ_HEART_DATA_INFO = 49 ;
const REQ_PERIOD_CARORIE_INTAKE_DATA = 53 ;
const REQ_USER_INFO = 3 ;

let access_id ;

let pluginInterface ;
let log = console.log ;

function genurl(reqid , args){
	let urlargs = '' ;
	args.request = reqid ;
	for( let arg in args )	urlargs += `&${arg}=${args[arg]}` ;
	return url.parse( HEALBE_BASE_URL+'?'+urlargs.slice(1) ) ;
}

function get(reqid,args){
	return new Promise((ac,rj)=>{
		let API_URL ;
		if( args.password != null && args.password.length>0)
			API_URL = genurl(REQ_AUTH,args) ;
		else {
			if( access_id == null ){
				rj({error:'No account information provided yet'}) ;
				return ;
			}
			API_URL = genurl(reqid,Object.assign({access_id:access_id}, args)) ;
		}
		https.get( API_URL , function(res) {
			res.setEncoding('utf8');
			let rep_body = '' ;
			res.on('data', function(str) {
				rep_body += str ;
			}) ;
			res.on('end', function() {
				try {
					ac( JSON.parse(rep_body) ) ;
				} catch(e){ rj({error:e.toString(),api:API_URL}); };
			});
		})
		.setTimeout(REQ_TIMEOUT)
		.on('timeout', function() {
			rj({error:'Request time out',api:API_URL});
		}).on('error', function(e) {
			rj({error:e.message,api:API_URL});
		});
	});
}

exports.init = function(pi){
	pluginInterface = pi ;
	log = pi.log ;

	access_id = pluginInterface.localStorage.getItem('access_id',null);

	pi.on('SettingsUpdated' , newSettings =>{
		if( newSettings.password && newSettings.password.trim().length>0 ){
			get(REQ_AUTH,{email:newSettings.email.trim(),password:newSettings.password.trim()})
				.then( token=>{
					pluginInterface.localStorage.setItem('access_id',token.access_id);
					access_id = token.access_id ;
				})
				.catch( console.error ) ;
			newSettings.password = '' ;
		}
	} ) ;

	return onProcCall ;
} ;

function onProcCall( method , path , args ){
	let re = {
		 activity:{reqid:REQ_USER_ACTIVITY}
		,full_day_summary:{reqid:REQ_FULL_DAY_SUMMARY}
		,sleep_event:{reqid:REQ_USER_EVENT,module_id:EVENT_SLEEP_MODULE_ID}
		,sleep_info:{reqid:REQ_SLEEP_INFO}
		,sleep_detailed_data:{reqid:REQ_SLEEP_DETAILED_DATA}
		,heart_data_info:{reqid:REQ_HEART_DATA_INFO}
		,period_carorie_intake_data:{reqid:REQ_PERIOD_CARORIE_INTAKE_DATA}
		,user_info:{reqid:REQ_USER_INFO}
	} ;

	if( args && args.option === 'true' ){
		for( let k in re){
			if( k == 'user_info') continue ;
			re[k].option = { doc:{ long:'Specify from,from_t,to_t,limit,sensor_id,utc_offset,days_count,items_array' } } ;
		}
	}

	switch(method){
	case 'GET' :
		if( path == '')
			return re ;
		if( re[path] == null )
			return {error:'No such resource'} ;

		return get(re[path].reqid,args) ;

	case 'POST' :
	case 'PUT' :
	case 'DELETE' :
	default :
		return {error:`The specified method ${method} is not implemented in admin plugin.`} ;
	}
}