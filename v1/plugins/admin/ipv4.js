const CHECK_ARP_TABLE_AND_PING_INTERVAL = 60*1000 ;
const PING_TIMEOUT_IN_SEC = 7 ;

const arped = require('arped');
const ping = require('ping');
const os = require('os');

/////////////////////////////////////////////
///   Exported methods
/////////////////////////////////////////////

// return: { mymac1:{net:net,ip:ip,self:(true|undefined)} , mymac2:{} ... }
// It also outputs available nets.
exports.getMACs = function(bSelfOnly){
	if( bSelfOnly !== true ) return objCpy(macs);
	let ret = {} ;
	for( const mac in macs ){
		if( macs[mac].self === true )
			ret[mac] = macs[mac] ;
	}
	return objCpy(ret) ;
}
function objCpy(src){
	return JSON.parse(JSON.stringify(src)) ;
	//return Object.assign({},src);
}

// If the third param is true, corresponding mac is searched
// by pinging to 
exports.getMACFromIPv4Address = function(net,ip,bSearch){
	return new Promise((ac,rj)=>{
		function checkInCache(){
			for( const mac in macs ){
				const macinfo = macs[mac] ;
				if( macinfo.net == net && macinfo.ip == ip ){
					ac(mac) ;
					return true ;
				}
			}
		}
		if( checkInCache() === true ) return ; // Found. accepted.

		// No corresponding ip in cache.
		chkArpTable()
		if( checkInCache() === true ) return ; // Found. accepted.

		if( !bSearch ){
			rj({error:'Not found in arp table.'});
			return ;
		}

		// Not listed in arp table. try ping to list the ip on arp table.
		ping_net(net,ip).then(bActive=>{
			chkArpTable();
			if( checkInCache() === true ) return ; // Found. accepted.
			rj({error:'Timeout'}) ;
		}).catch(()=>{
			rj({error:'Ping error'}) ;
		});
	}) ;
}

exports.setNetCallbackFunctions = function(
	 _onMacFoundCallback , _onMacLostCallback , _onIPChangedCallback ){
		onMacFoundCallback	= _onMacFoundCallback	|| function(net,newmac,newip){} ;
		onMacLostCallback	= _onMacLostCallback	|| function(net,lostmac,lostip){} ;
		onIPChangedCallback	= _onIPChangedCallback	|| function(net,mac,oldip,newip){} ;
} ;

/////////////////////////////////////////////
////   Exports ended
/////////////////////////////////////////////

let macs = {} ;
let onMacFoundCallback , onMacLostCallback , onIPChangedCallback ;


// Initialize
exports.setNetCallbackFunctions(
	function(net,newmac,newip){
		log(`onMacFoundCallback("${arguments[0]}","${arguments[1]}","${arguments[2]}")`);
	}
	,function(net,lostmac,lostip){
		log(`onMacLostCallback("${arguments[0]}","${arguments[1]}","${arguments[2]}")`);
	}
	,function(net,mac,oldip,newip){
		log(`onIPChangedCallback("${arguments[0]}","${arguments[1]}","${arguments[2]}","${arguments[3]}")`);
	}
) ;


/////////////////////////////////////////////
///   Utility functions
/////////////////////////////////////////////


function log(msg){
	if( typeof(msg)=='object')	console.log(JSON.stringify(msg,null,'\t')) ;
	else						console.log(msg) ;
}

function ping_net(net,ip){
	return new Promise((ac,rj)=>{
		try {
			let params = {timeout:PING_TIMEOUT_IN_SEC} ;
			switch(process.platform){
			case 'win32' :
			case 'win64' : // Never hits
				break ;
			case 'darwin' :
			case 'freebsd' :
				params.extra = ['-S',net] ;
				break ;
			default :
				params.extra = ['-I',net] ;
				break ;
			}

			ping.sys.probe(ip, ac, params ) ;
		} catch(e){rj(e)} ;
	}) ;
}

function isNetworkSame(maskstr,ip1str,ip2str){
	function convToNum(ipstr){
		let ret=0 , mul = 256*256*256 ;
		ipstr.split('.').forEach(numstr=>{ret += parseInt(numstr)*mul;mul>>=8;} );
		return ret ;
	}
	let mask = convToNum(maskstr) ;
	let ip1 = convToNum(ip1str) ;
	let ip2 = convToNum(ip2str) ;
	return (ip1&mask) == (ip2&mask) ;
}

function chkArpTable(){
	let oldmacs = macs ;

	try {
		macs = {} ;

		// Check arp text
		//log('Checking arp table..') ;
		let newobj = arped.parse(arped.table()) ;
		//log('ARP table object:') ; log(newobj,null,"\t") ;

		// Register new mac address and corresponding IP
		let nets = {} ;	// Used only for windows env.
		for( const net in newobj.Devices ){
			for( const mac in newobj.Devices[net].MACs ){
				if( mac === '00:00:00:00:00:00' || mac === 'ff:ff:ff:ff:ff:ff' ) continue ;
				macs[mac] = { net:net , ip:newobj.Devices[net].MACs[mac] } ;
				if( nets[net] == null )	// Believe the first device is truly in this net. (Inprecise. Windows only)
					nets[net] = macs[mac].ip ;
			}
		}

		// Trace self info
		//log('Checking self MACs/IPs..') ;
		let ifaces = os.networkInterfaces() ;
		//log('networkInterfaces object:') ; log(ifaces) ;
		for( const _mynet in ifaces ){
			ifaces[_mynet].forEach(iinfo=>{
				if( iinfo.family !== 'IPv4' || iinfo.internal === true ) return ;
				macs[iinfo.mac] = {net:_mynet,ip:iinfo.address,self:true} ;

				let mynet = _mynet ;

				if( process.platform.indexOf('win') == 0 && nets[mynet] == null ){
					// New network? Net name different? (No way to tell because network name
					// in arp and os.networkInterface can be different.)
					for( const net in nets ){
						// Seems to be in the same net... network name is copied from
						// arp one.
						if( isNetworkSame(iinfo.netmask,iinfo.address,nets[net])){
							macs[iinfo.mac].net = net ;
							mynet = net ;
							break ;
						}
					}
				}

				// Check devices are really in this network. (only happens in windows)
				for( const mac in macs ){
					if( macs[mac].net != mynet ) continue ;
					if( !isNetworkSame(iinfo.netmask,iinfo.address,macs[mac].ip) ){
						delete macs[mac] ;
					}
				}
			}) ;
		}

		// Differenciate and call external callbacks for network change.
		// Compare new arp => old arp
		for( const mac in macs ){
			if( oldmacs[mac] == null ){
				// New mac appeared
				onMacFoundCallback(macs[mac].net , mac , macs[mac].ip ) ;
			} else if( oldmacs[mac].net !== macs[mac].net ){
				// Network changed
				onMacLostCallback( oldmacs[mac].net , mac , oldmacs[mac].ip ) ;
				onMacFoundCallback(macs[mac].net , mac , macs[mac].ip ) ;
				delete oldmacs[mac] ;
			} else if( oldmacs[mac].ip !== macs[mac].ip ){
				// IP address changed
				onIPChangedCallback(macs[mac].net , mac , oldmacs[mac].ip , macs[mac].ip ) ;
				delete oldmacs[mac] ;
			} else {
				// mac,net,ip are the same.
				delete oldmacs[mac] ;
			}
		}

		// Compare old arp => new arp (remains losts.)
		for( const mac in oldmacs ){
			onMacLostCallback( oldmacs[mac].net , mac , oldmacs[mac].ip ) ;
		}

		//log('New macs:'); log(macs);
	} catch(e){
		macs = oldmacs ;
	}
}

setInterval(()=>{
	chkArpTable() ;
	for( const mac in macs ){
		ping_net(macs[mac].net,macs[mac].ip);
	}

},CHECK_ARP_TABLE_AND_PING_INTERVAL) ;

// Initial check
chkArpTable() ;