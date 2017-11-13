// namedpipe client
var fs = require('fs');
var clientInterface , globals ;
var log = console.log ;

exports.init = function(_clientInterface,_globals){
	clientInterface = _clientInterface ;
	globals = _globals ;
	log = clientInterface.log ;

	var pipe_prefix = globals.cmd_opts.get('pipe') ;
	if( !pipe_prefix ) return ;

	// Pipe postfix
	// _r (read port from client's viewpoint)
	// _w (write port from client's viewpoint)
	const PIPE_NAME = {read:pipe_prefix+'_w',write:pipe_prefix+'_r'} ;

	function onerror(msg){
	    console.error('Error in communicating with named pipe '+pipe_prefix+'_r/_w:');
	    console.error(msg);
	    console.error('Stoped using named pipe.');
	}
	try {
		console.log('Connecting to named pipe '+pipe_prefix+'_r/_w (block until target process is connected.)') ;
		// Read stream setup
		var rs = fs.createReadStream(PIPE_NAME.read, 'utf-8');
		var ws ;

		var readbuf = '' ;
		rs	.on('data', data=>{
				readbuf += data ;
				var ri = readbuf.lastIndexOf("\n") ;
				if( ri<0 ) return ;
				var focus = readbuf.slice(0,ri) ;
				readbuf = readbuf.slice(ri+1) ;

				focus.split("\n").forEach(req_str=>{
					var req = JSON.parse(req_str) ;
					if( req.method.toUpperCase() == 'SUB' ){
						clientInterface.subscribe(req.path,re=>{
							ws.write(JSON.stringify(re)) ;
						}) ;
						ws.write(JSON.stringify({success:true,tid:req.tid}));
					} else if( req.method.toUpperCase() == 'UNSUB' ){
						clientInterface.unsubscribeall(req.path) ;
						ws.write(JSON.stringify({success:true,tid:req.tid}));
					} else {
						clientInterface.callproc(req).then(re=>{
							re.tid = req.tid ;
							ws.write(JSON.stringify(re)+"\n") ;
						}).catch(e=>{
							e.tid = req.tid ;
							ws.write(JSON.stringify(e)+"\n") ;
						}) ;
					}
				}) ;
		    })
	    	.on('open',()=>{		console.log('Read pipe opened.');})
	    	.on('error', err =>{	onerror(JSON.stringify(err)); })
	    	.on('close',()=>{
	    		clientInterface.unsubscribeall();
	    		onerror('Read pipe closed.');
	    	}) ;

	    // Write stream setup
	    ws = fs.createWriteStream(PIPE_NAME.write, 'utf-8');
	    ws	.on('drain', ()=>{})
	    	.on('open',()=>{		console.log('Write pipe opened.');})
	        .on('error', err =>{ onerror(JSON.stringify(err)); })
	        .on('close', ()=>{
	    		clientInterface.unsubscribeall();
	        	onerror('Write pipe closed.');
	        })
	        //.on('pipe',  src =>{});
	} catch (err) {
		//console.error(err) ;
	    console.error('Error in named pipe communication.');
	    console.error('Stoped using named pipe.');
   		clientInterface.unsubscribeall();
	}
}