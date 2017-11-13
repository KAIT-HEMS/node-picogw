var fs = require('fs');
const REQ_TIMEOUT = 30*1000 ;

let pluginInterface ;
let log = console.log ;

let slackBot ;

exports.init = function(pi){
	pluginInterface = pi ;
	log = pluginInterface.log ;

	function initSlack(){
		try {
			const SLACK_TOKEN = pluginInterface.localStorage.getItem('bottoken',null) ;
			if( SLACK_TOKEN == null )
				return {error:'Please set Slack bot API token first.'} ;
			const Botkit = require('botkit');
			const controller = Botkit.slackbot();
			slackBot = controller.spawn({
			  token: SLACK_TOKEN
			}).startRTM(function(err,bot,payload) {
				if (err){
					log('Could not connect to Slack');
					return ;
				}
				slackBot = bot ;

				controller.hears([''],'direct_message,direct_mention,mention', (bot, message) => {
					const cmd = message.text.split(' ')[0] ;
					const params = message.text.slice(cmd.length).trim() ;
					log(`Publish to topic ${cmd} : ${params}`) ;
					pluginInterface.publish( cmd , {params:params}) ;
				});
			});
		} catch( e ){
			return {error:'Please set Slack bot API token first.'}
		}
	}


	pluginInterface.on('SettingsUpdated' , newSettings =>{
	 if( newSettings.bottoken != null ){
	 	pluginInterface.localStorage.setItem('bottoken',newSettings.bottoken) ;
	 	newSettings.bottoken = '' ;	// Keep it secret
	 	initSlack() ;
	 }
	} ) ;

	initSlack() ;

	return onProcCall ;
} ;

function onProcCall( method , path , args ){
	switch(method){
	case 'GET' :
		if( path == '' ){
			let re = {post:{text:'[TEXT TO SAY]'}} ;
			if( args && args.option === 'true' ){
				re.post.option = { doc:{ short:'Bot to say something' } } ;
			}
			return re ;
		}
		// break ; proceed to POST
	case 'POST' :
		if( path != 'post')
			return {error: `path ${path} is not supported.`} ;
		if( args.text == null || args.text == '' )
			return {error: `No text to say.`} ;
		if( !slackBot )
			return {error: `Slack token is not properly set.`} ;

		return new Promise((ac,rj)=>{
			getChannelsList().then(channels=>{
				channels.forEach(channel=>{
					slackBot.say({
						text : args.text
						,channel: channel.id
					}) ;
				});
				ac({success:'Successfully posted to channels ['+channels.map(ch=>ch.name).join(',')+']'}) ;
			}).catch(rj) ;
		}) ;

/*
		return new Promise( (ac,rj)=>{
			let API_URL ;
			try {
				let settings ;
				try {
					settings = JSON.parse( fs.readFileSync(pluginInterface.getpath()+'settings.json').toString() ) ;
					if( typeof settings.APPID != 'string') throw {} ;
				} catch(e){
					rj({error:'No openweathermap API key is specified.\nYou can obtain your own api key by creating OpenWeatherMap account on https://home.openweathermap.org/users/sign_up'}) ;
					return ;
				} ;
				settings = Object.assign(settings,args) ;

				let settings_flat = '' ;
				for( let key in settings ){
					if( settings[key] == null || settings[key]=='' ){
						delete settings[key] ;
 						continue ;
					}
					settings_flat += '&'+key+'='+settings[key] ;
				}

				API_URL = OPENWEATHERMAP_BASE_URL+path+'?'+settings_flat.slice(1) ; //remove first &

				if( settings.q == null && (settings.lat == null || settings.lon == null ) )
					rj({error:'No position data specified.',api:API_URL }) ;


				http.get(API_URL, function(res) {
					res.setEncoding('utf8');
					let rep_body = '' ;
					res.on('data', function(str) {
						rep_body += str ;
					}) ;
					res.on('end', function() {
						try {
							ac(JSON.parse(rep_body)) ;
						} catch(e){ rj({error:e.toString(),api:API_URL}); };
					});
				})
				.setTimeout(REQ_TIMEOUT)
				.on('timeout', function() {
					rj({error:'Request time out',api:API_URL});
				}).on('error', function(e) {
					rj({error:e.message,api:API_URL});
				});
			} catch(e){ rj({error:e.toString(),api:API_URL}); };
		}) ;*/
	case 'POST' :
	case 'PUT' :
	case 'DELETE' :
	default :
		return {error:`The specified method ${method} is not implemented in admin plugin.`} ;
	}
}

function getChannelsList(){
	if( slackBot == null ) return Promise.reject({error:'Bot is not defined yet'}) ;

	return new Promise((ac,rj)=>{
		slackBot.api.channels.list({},function(err,response) {
			if( err ){ rj({error:err});return; }
			let channels = response.channels.filter(channel=>channel.is_member&&!channel.is_archived) ;
			channels = channels.map(function(channel){
				let ret = {} ;
				['id','name','purpose'].forEach(elem=>ret[elem]=channel[elem]) ;
				return ret ;
			}) ;
			ac(channels) ;
		});
	});
}