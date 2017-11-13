const PICOGW_PORT = 8080 ;

const WebSocketClient = require('websocket').client;
const wsClient = new WebSocketClient();

let wsConn ;

function log(msg){console.log('[api] '+msg);}

let subs = {} ;
let tid = 0 ;
let waitlist = {} ;

let sendUTFQueue=[] ;
function sendUTF(msg){

    //log('Sending '+msg+' wsConn:'+(wsConn!=null)) ;
	if( wsConn == null ){
		if( msg != null )
			sendUTFQueue.push(msg) ;
		setTimeout(sendUTF,1000) ;
		return ;
	}
	if( msg != null )
		sendUTFQueue.push(msg) ;

	sendUTFQueue.forEach(m=>{
		wsConn.sendUTF(m) ;
		log('Node-RED=>PicoGW:'+m) ;
	}) ;
	sendUTFQueue=[] ;	
}

module.exports = function(RED) {
    setupNetwork() ;

    function picogw(config) {
        if( config.resource.slice(-1)=='/') config.resource = config.resource.slice(0,-1) ;

        RED.nodes.createNode(this,config);

        const node = this;
        const path = config.resource ;
        const poll_interv = parseInt(config.polling)
        const args_for_poll = config.args_for_poll ;


        function call_body(msg){
            if(msg.payload != null ) msg = msg.payload ;
            const _tid = tid++ ;
            sendUTF(JSON.stringify({
                method:msg.method
                ,path:path
                ,args:msg.args
                ,tid:_tid
            }));
            waitlist[_tid] = function(re){
                //re.tid = _tid ; // Copy transaction ID (to recognize reply of GET/PUT method)
                re.reqid = msg.reqid ;  // Forward input's reqid (Primarily for implementing v2)
                node.send(re) ;
            } ;
            setTimeout(()=>{delete waitlist[_tid];},30*1000) ;  // Timeout
        }

        node.on('input', call_body );

        if( poll_interv > 0 ){
            log('Polling '+path);
            const interv_id = setInterval(()=>{
                var args ;
                if(args_for_poll != null ){try {
                    args = JSON.parse(args) ;
                } catch(e){} }
                call_body({
                    method:'GET'
                    ,args: args
                })
            },poll_interv*1000) ;
            node.on('close', function() {
                log('Stop polling '+path) ;
                clearInterval(interv_id) ;
            }) ;
        } else {
            log('Subscribe '+path);
            sendUTF(JSON.stringify({method:'SUB',path:path})) ;
            if( subs[path] == null ) subs[path] = [node] ;
            else {
                subs[path] = subs[path].filter(n=>n.id!=node.id) ;
                subs[path].push(node) ;
            }
            node.on('close', function() {
                log('Unsubscribe '+path) ;
                sendUTF(JSON.stringify({method:'UNSUB',path:path})) ;
                subs[path] = subs[path].filter(n=>n.id!=node.id) ;
            }) ;
        }
    }
    RED.nodes.registerType("call picogw",picogw);
}

function setupNetwork(){
    function connect(){
        if( wsConn == null ){
            log(`connecting ws://localhost:${PICOGW_PORT}/`);
            wsClient.connect(`ws://localhost:${PICOGW_PORT}/`, 'picogw');
    	}
    }


    wsClient.on('connectFailed', function(error) {
        log('Connect Error: ' + error.toString());
        setTimeout(connect, 3000);
    });

    wsClient.on('connect', function(connection) {
        log('Connected to PicoGW');
        wsConn = connection ;

        wsConn.on('error', function(error) {
            log("Connection error: " + error.toString());
        });
        wsConn.on('close', function() {
            log('Connection closed');
            wsConn = null ;
            setTimeout(connect, 3000);
        });
        wsConn.on('message', function(message) {
            if (message.type === 'utf8') {
                log("PicoGW=>Node-RED: '" + message.utf8Data + "'");
                try {
                    const cmd = JSON.parse(message.utf8Data) ;
                    switch( cmd.method ){
                    case 'PUB':
                        for( let p in cmd ){
                            if( p == 'method' ) continue ;
                            if( subs[p] != null ){
                                subs[p].forEach(n=>{
                                    // Pick interested path only
                                    let d = {method:'PUB'} ;
                                    d[p] = cmd[p] ;
                                    n.send(d) ;
                                    //n.send(cmd[p]) ;
                                });
                            }
                        }
                        break ;
                    default :
                        if( waitlist[cmd.tid] != null ){
                            waitlist[cmd.tid](cmd) ;
                            /*for( let p in cmd ){
                                if( p == 'tid' ) continue ;

                                waitlist[cmd.tid](cmd[p]) ;
                            }*/
                            delete waitlist[cmd.tid] ;
                        }
                    }
                } catch(e){}
            }
        });
    });

    connect() ;
}
