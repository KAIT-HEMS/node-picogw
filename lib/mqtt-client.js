//const vm = require('vm'); // For loose JSON parse
const mqtt = require('mqtt');
//let pi, localStorage, log;
let log = console.log;
let brokerAddr, qos;
let mclient;

let pubtopic_crud , pubtopic_prefix_plugin ;

//let globals , adminLocalStorage;
let PubSub, callProc ;

exports.init = function(_globals,localStorage){
	globals = _globals ;
	adminLocalStorage = localStorage;
	PubSub = globals.PubSub;
	callProc = globals.callProc;

	PubSub.sub('.', function ( arg ){
		if( arg.method != 'PUB' ) return;
		for( let path in arg ){
			if( path == 'method' || path.indexOf('/v1')<0) continue ;
			if( path.indexOf('/v1/admin/client_settings')==0 ) continue ;
			publish( arg[path] , path );
		}
	} );

}

exports.setupServerConnection = function(settings){
	return new Promise((ac,rj)=>{

		function doConnect(){
			if( !settings.enable ){
				ac(settings);
				return;
			}

			const myid = settings.myid ;

			brokerAddr = settings.broker_address ;
			qos = settings.qos ;

			log('Connecting to '+brokerAddr);

			const subtopic_crud = settings.topic_crud_sub.split('${id}').join(myid);
			pubtopic_crud = settings.topic_crud_pub.split('${id}').join(myid);
			pubtopic_prefix_plugin = settings.topic_prefix_plugin.split('${id}').join(myid);

			// Allows self-signed certificate
			mclient  = mqtt.connect(brokerAddr,{rejectUnauthorized: false});
			
			mclient.on('connect', ()=>{
				mclient.subscribe(subtopic_crud, {qos:qos}, function (err,granted) {
				if( err ){
					log(err);
					rj( {errors:[{message:`Could not subscribe to ${brokerAddr}/${subtopic_crud}.`,error:err}]} );
				} else {
					log(`Connected to ${brokerAddr}. Waiting at topic '${subtopic_crud}'.`);
					// log(JSON.stringify(granted,null,'\t'));
					ac(settings);
				}
				});
			});
			
			mclient.on('message', (topic,message)=>{
				if( topic != subtopic_crud ) return ; // Buggy?

				// Handle REST request
				try {


					let req = JSON.parse(message);
					/*
					// Accept less strict JSON string than JSON.parse() // original code: let req = JSON.parse(message);
					const context = vm.createContext({});
					const script = new vm.Script('('+message+')');
					let req = script.runInContext(context);
					*/

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

function publish(payload,topicPostfix){
	if( mclient == null ){
		//console.error('Not connected to a mqtt broker: cannot publish.')
		return false;
	}

	const topic = (topicPostfix == null
		? pubtopic_crud                         // CRUD response publish
		: pubtopic_prefix_plugin + topicPostfix // Spontaneous publish from plugins
	) ;

	//log(`MQTT:Publish to ${topic}, payload=${JSON.stringify(payload)}, qos=${qos}`);

	mclient.publish( topic , JSON.stringify(payload) , {qos:qos} );

	return true;
}
