const mqtt = require('mqtt');
//let pi, localStorage, log;
let log = console.log;
let brokerAddr, qos;
let topicPrefix;
let mclient;

//let globals , adminLocalStorage;
let PubSub, callProc ;

exports.init = function(_globals,localStorage){
	globals = _globals ;
	adminLocalStorage = localStorage;
	PubSub = globals.PubSub;
	callProc = globals.callProc;

	PubSub.sub('.', function ( arg ){
		if( arg.method != 'PUB' ) return;
		log('Published by plugin:'+JSON.stringify(arg));
		for( let path in arg ){
			if( path == 'method' || path.indexOf('/v1')<0) continue ;
			publish( arg[path] , path );
		}
	} );
	/*
		globals.PubSub
		globals.cmd_opts
		globals.callProc
		globals.config
		globals.getPubKey
		globals.encrypt
		globals.decrypt
		globals.admin
		globals.admin.init
		globals.admin.getMACFromIPv4Address_Forward
		globals.admin.setNetCallbacks_Forward
		globals.admin.getMACs
		globals.admin.onCall
		globals.admin.onUIGetSettingsSchema
		globals.admin.onUISetSettings
		globals.admin.routeSet
		globals.admin.routeDelete
		globals.admin.supportedNetworkManager
		globals.admin.getNetworkInterfaces
		globals.admin.searchNetworkInterface
		globals.admin.startCheckingArpTable
	*/
	//for( let key in globals.admin){
	//	console.log('globals.admin.'+key);
	//}
}

exports.setupServerConnection = function(settings){
	return new Promise((ac,rj)=>{

		function doConnect(){
			if( !settings.enable ){
				ac(settings);
				return;
			}

			topicPrefix = settings.topicPrefix ;

			brokerAddr = settings.broker_address ;
			qos = settings.qos ;
			//topicPrefix = await getMyMac();

			log('Connecting to '+brokerAddr);

			// Allows self-signed certificate
			mclient  = mqtt.connect(brokerAddr,{rejectUnauthorized: false});
			
			mclient.on('connect', ()=>{
				log(`Connected to ${brokerAddr}. Waiting at topic '${topicPrefix}-Req'.`);
				mclient.subscribe(`${topicPrefix}-Req`, {qos:qos}, function (err,granted) {
				if( err ){
					log(err);
					rj( {errors:[{message:`Could not subscribe to ${brokerAddr}/${topicPrefix}.`,error:err}]} );
				} else {
					// log(JSON.stringify(granted,null,'\t'));
					ac(settings);
				}
				});
			});
			
			mclient.on('message', (topic,message)=>{
				if( topic != `${topicPrefix}-Req` ) return ;
				try {
					let req = JSON.parse(message);
					//onRequest(message);

					callProc(req).then(re=>{
						re.tid = req.tid;
						publish(re);
					}).catch(e=>{
						e.tid = req.tid;
						publish(e);
					});
				} catch(e){
					publish({errors:[{message:'Non-json request received',error:e}]});
				}
			});

			mclient.on('error', (error)=>{
				log(err);
				if(mclient){
					log('Disconnecting from broker..');
					mclient.end(true);
					mclient = null ;
				}
			});
		}

		if( mclient == null ){
			doConnect();
		} else {
			mclient.end(true,()=>{
				log('Disconnected from the current broker.');
				mclient = null ;
				doConnect();
			});
		}
	});
}

function publish(payload,topicPostfix=''){
	if( mclient == null ){
		//console.error('Not connected to a mqtt broker: cannot publish.')
		return false;
	}

	log(`Publish to ${topicPrefix + topicPostfix}, payload=${JSON.stringify(payload)}, qos=${qos}`);

	mclient.publish(topicPrefix + topicPostfix
		, JSON.stringify(payload)
		, {qos:qos}
	);
	return true;
}

/*
function onRequest(req) {
    // message is Buffer
    //console.log('Req:'+JSON.stringify(req));
    switch( req.method.toUpperCase() ){
    case 'GET' :
		callProc(req).then(re=>{
			re.tid = req.tid;
			publish(re);
		}).catch(e=>{
			e.tid = req.tid;
			publish(e);
		});
		break ;
    case 'SUB' :
		pi.client.subscribe(req.path,publish);

		// Subscribed message (Ack)
		publish({success: true, tid: req.tid});

		break ;
    case 'UNSUB' :
		pi.client.unsubscribeall(req.path);
		// Unsubscribed message (Ack)
		publish({success: true, tid: req.tid});
		break ;
    default:
		log(`Unsupported method:${req.method}`);
		break ;
    }

};
*/
