const GET_TIMEOUT = 60 * 1000 ;
const MY_EOJ = [0x05,0xff,0x01] ;
const LOCALE = 'EN' ;

// first DEVICE_MULTICAST_INTITIAL_NUMBER accesses are done in every
// DEVICE_MULTICAST_INITIAL_INTERVAL ms. Then the frequency becomes
// DEVICE_MULTICAST_INTERVAL ms.
var DEVICE_MULTICAST_INTITIAL_NUMBER = 4 ;
const DEVICE_MULTICAST_INITIAL_INTERVAL = 15*1000 ;
const DEVICE_MULTICAST_INTERVAL = 60*1000 ;

var VERSION = 'v1';

/*// If you add 'makercode' entry to localstorage.json (as a number), the number is
// loaded to this MAKER_CODE variable.
var MAKER_CODE = 0 ;*/

var fs = require('fs');
var EL = require('echonet-lite');
var ProcConverter = require( './proc_converter.js') ;


var pluginInterface ;
var log = console.log ;
var localStorage ;

var macs = {} ;
var mynet ;
function savemac(){ localStorage.setItem('macs',macs) ; }

/* macs entry format:
key:macaddress
value: {
	ip : LAST_AVAILABLE_IP_ADDRESS
	, active:true (at least one message is received since last boot.)|false (otherwise)
	, nodeprofile : {
		 version: VERSION(0x82) , id: ID(0x83) ,date: PRODUCTION_DATE(0x8e / optional))
	}
	, devices :{
		DEVICE_ID (etc. DomesticHomeAirConditioner_1) : {
			  eoj : object identifier (eg. 0x013001)
			, active :  true (the device is registered to the controller)
						| false (the user deleted this device)
						| null (the device is not registered yet)
			, location : 0x81
			, error : 0x88
			, date : PRODUCTION_DATE (0x8e / optional)
			, worktime : cumulated working time (0x9a / optional)
			, propertymap : [] array of available properties
			, options : {} device specific information extracted from devices DB
		},
	}
	, eoj_id_map : {	// EOJ (eg.013001) to DEVICE_ID (eg. DomesticHomeAirConditioner_1) mapping
		EOJ: DEVICE_ID,
	}
}
*/

function expandDeviceIdFromPossiblyRegExpDeviceId(device_id_with_regexp){
	var re = [] ;
	var regexp = new RegExp(device_id_with_regexp) ;
	for( var mac in macs ){
		for( var devid in macs[mac].devices ){
			if( devid.match(regexp) ){
				re.push(devid) ;
			}
		}
	}

	return re ;
}

function getMacFromDeviceId(device_id){
	for( var mac in macs ){
		for( var devid in macs[mac].devices ){
			if( devid == device_id ){
				return mac ;
			}
		}
	}
	return undefined ;
}

function assert(bAssertion,msg){
	if( bAssertion === true ) return ;
	if( typeof msg == 'string' )
		log('Assertion failed:'+msg);
	else
		log('Assertion failed');
}

let ELDB = {} ;

const IP_UNDEFINED = '-' ;

exports.init = function(pi /*,globals*/){
	pluginInterface = pi ;
	log = pluginInterface.log ;

	localStorage = pluginInterface.localStorage ;
	macs = localStorage.getItem('macs',{}) ;
	//MAKER_CODE = localStorage.getItem('makercode',MAKER_CODE) ;

	// Reset states
	for( const mac in macs ){
		macs[mac].active = false ;
		for( const devid in macs[mac].devices )
			macs[mac].devices[devid].active = false ;
	}

	function setIPAddressAsUnknown(ip){
		if( ip == IP_UNDEFINED ) return ;
		for( const mac in macs ){
			if( macs[mac].ip !== ip) continue ;
			macs[mac].ip = IP_UNDEFINED;
			// macs[mac].active = false;
		}
	}

	pluginInterface.setNetCallbacks({
		 onMacFoundCallback : function(net,newmac,newip){
			log(`onMacFoundCallback("${arguments[0]}","${arguments[1]}","${arguments[2]}")`);
			assert( net == mynet , 'onMacFoundCallback' );

			setIPAddressAsUnknown(newip);
			// Really new MAC (if it is an ECHONET device, it will be discovered later.)
			if( macs[newmac] == null ) return ;
			macs[newmac].active = true ;
			macs[newmac].ip = newip ;
		 }
		,onMacLostCallback : function(net,lostmac,lostip){
			log(`onMacLostCallback("${arguments[0]}","${arguments[1]}","${arguments[2]}")`);
			assert( net == mynet , 'onMacLostCallback' );
			setIPAddressAsUnknown(lostip);
			if( macs[lostmac] != null )
				macs[lostmac].active = false ;
		}
		,onIPChangedCallback : function(net,mac,oldip,newip){
			log(`onIPChangedCallback("${arguments[0]}","${arguments[1]}","${arguments[2]}","${arguments[3]}")`);
			assert( net == mynet , 'onIPChangedCallback' );
			setIPAddressAsUnknown(newip);
			assert( macs[mac].ip == oldip , 'onIPChangedCallback : old ip '+oldip+'does not exist' );
			macs[mac].ip = newip ;
		 	EL.sendOPC1( EL.EL_Multi, [0x0e,0xf0,0x01], [0x0e,0xf0,0x01], 0x73, 0xd5, EL.Node_details["d5"] );
		}
	}) ;

	// Set mynet: Take the first one.
	//   This should be specified through GUI in the future.
	const myMACs = pluginInterface.getMACs(true) ;
	for( const mynet_caididate in myMACs ){
		mynet = myMACs[mynet_caididate].net ;
		break ;
	}


	// Initialize echonet lite
	const MY_PROPS = JSON.parse( fs.readFileSync(pluginInterface.getpath()+'controller_properties.json','utf-8')) ;
	// Copy maker code to node profile
	if( MY_PROPS['8a'] != undefined )
		EL.Node_details['8a'] = MY_PROPS['8a'] ;

	// Construct ELDB
	// Load database with minimization / resource embedding
	{
		let data = JSON.parse( fs.readFileSync(pluginInterface.getpath()+'all_Body.json','utf-8')) ;
		let names = JSON.parse( fs.readFileSync(pluginInterface.getpath()+'all_'+LOCALE+'.json','utf-8')).names ;
		for( let objname in data.elObjects ){
			let objnamelc = objname.substring(2).toLowerCase() ;
			let eoj = data.elObjects[objname] ;
			let minimize_obj
				= {objectType:eoj.objectType , objectName:names[eoj.objectName] , epcs:{}} ;

			for( let epcname in eoj.epcs ){
				let edtconvs = undefined ;
				try {
					edtconvs = ProcConverter.eojs[objnamelc][epcname.substring(2).toLowerCase()] ;
				} catch(e){}
				minimize_obj.epcs[epcname.substring(2).toLowerCase()] = {
					epcType : eoj.epcs[epcname].epcType
					, epcName : names[eoj.epcs[epcname].epcName]
					, epcDoc : eoj.epcs[epcname].doc
					, edtConvFuncs : edtconvs
					, test : eoj.epcs[epcname].test
				} ;
			}
			ELDB[objnamelc] = minimize_obj ;
		}
		delete data ;
		delete names ;

		// add superclass epcs to subclasses
		let sepcs = ELDB['0000'].epcs ;
		for( let sepc in sepcs )	sepcs[sepc].super = true ;

		for( let oeoj in ELDB ){
			if( oeoj == '0000' ) continue ;
			for( let sepc in sepcs )
				if( ELDB[oeoj].epcs[sepc] == undefined )
					ELDB[oeoj].epcs[sepc] = sepcs[sepc] ;
				else if(ELDB[oeoj].epcs[sepc].edtConvFuncs == undefined )
					ELDB[oeoj].epcs[sepc].edtConvFuncs = sepcs[sepc].edtConvFuncs ;
		}
	}
	// fs.writeFileSync(pluginInterface.getpath()+'minimized.json',JSON.stringify(ELDB ,null,"\t")) ;

	// Replace the original function	
	// ネットワーク内のEL機器全体情報を更新する，受信したら勝手に実行される
	EL.renewFacilities = function( ip, els ) {
		//console.dir(els) ;
		//log(`getMACFromIPv4Address(${mynet},${ip})`);
		pluginInterface.getMACFromIPv4Address(mynet,ip,true).then(mac=>{
			try {
				const seoj = els.SEOJ.substring(0,4) ;
				var epcList = EL.parseDetail( els.OPC, els.DETAIL );
				if(ELDB[seoj] == undefined) {
					log(`A message from unknown EOJ ${seoj} on ${ip} is ignored.`);
					return ;
				}
				if( macs[mac] == undefined ){
					macs[mac] = {ip:ip,active:true,nodeprofile:{},devices:{},eoj_id_map:{}} ;
				} else {
					macs[mac].active = true ;
					setIPAddressAsUnknown(macs[mac].ip) ;
					macs[mac].ip = ip ; // ip may be changed
				}

				var mm = macs[mac] ;

				// 機器が発見された
				function onDevFound(eoj){
					if( mm.eoj_id_map[eoj] != undefined ) {
						// Already defined device
						var dev = mm.devices[ mm.eoj_id_map[eoj] ] ;
						if( dev.active !== true ){	// First time since last boot
							registerExistingDevice(mm.eoj_id_map[eoj]) ;
							EL.getPropertyMaps( ip, EL.toHexArray(eoj) );
							//log('Predefined device '+mm.eoj_id_map[els.SEOJ]+' replied') ;
						}
					} else if(ELDB[eoj.slice(0,4)] == undefined) {
						log(`EOJ ${eoj} on ${ip} is not found in ECHONET Lite DB.`);
						return ;
					} else {
						var devid = ELDB[eoj.slice(0,4)].objectType ;
						if( devid == undefined ) return ;
						var c = localStorage.getItem(devid+'_Count',0) + 1 ;
						localStorage.setItem(devid+'_Count',c) ;

						devid = devid+'_'+c ;
						mm.eoj_id_map[eoj] = devid ;
						mm.devices[devid] = { eoj : eoj } ;
						log('New device '+devid+' found') ;

						registerExistingDevice(devid) ;
						EL.getPropertyMaps( ip, EL.toHexArray(eoj) );
					}
				}

				function instanceListProc(ilist){
					var inst_num = parseInt(ilist.slice(0,2)) ;
					var insts = ilist.slice(2) ;
					while( insts.length>5 ){
						onDevFound(insts.slice(0,6)) ;
						insts = insts.slice(6) ;
					}
					savemac() ;
				}

				if( seoj != '0ef0' ){
					onDevFound(els.SEOJ) ;
					savemac() ;
				} else if(els.DEOJ == '0ef001' && els.ESV == '73'
					&& els.DETAILs != undefined && els.DETAILs.d5 != undefined ){
					// Device added to network announcement
					instanceListProc(els.DETAILs.d5) ;
				} else if(els.SEOJ == '0ef001' && els.ESV == '72'
					&& els.DETAILs != undefined && els.DETAILs.d6 != undefined ){
					// Respose for searching node instance list
					instanceListProc(els.DETAILs.d6) ;
				}


				var tgt = (seoj=='0ef0' ? mm.nodeprofile : mm.devices[ mm.eoj_id_map[els.SEOJ] ]) ;
				for( var epc in epcList ) {

					let epco = undefined , epcType = undefined , edtConvFunc = undefined ;
					/*if( seoj != '0ef0'){
						epco = ELDB['0000'].epcs[epc] ;
						if( epco != undefined ){
							epcType = epco.epcType ;
							if( epco.edtConvFuncs != undefined )	edtConvFunc = epco.edtConvFuncs[0] ;
						}
					}*/
					if( ELDB[seoj] != undefined )	epco = ELDB[seoj].epcs[epc] ;
					else							epco = ELDB['0000'].epcs[epc] ;
					if( epco != undefined ){
						if( epco.epcType != undefined )			epcType = epco.epcType ;
						if( epco.edtConvFuncs != undefined )	edtConvFunc = epco.edtConvFuncs[0] ;
					}
					//}

					if(epcType == undefined)	epcType = epc ;
					if( epcList[epc]=='')	continue ;

					let edt = epcList[epc] = EL.toHexArray(epcList[epc]) ;
					let bEdtUpdated = (tgt[epcType]==undefined || JSON.stringify(tgt[epcType].cache) !== JSON.stringify(edt)) ;
					if(bEdtUpdated)		tgt[epcType] = { cache : edt , timestamp : Date.now() } ;
					else 				tgt[epcType].timestamp = Date.now() ;

					// reply of get request? (works only for first OPC)
					// Ideally, this process should be outside of epc loop, but
					// just to easily get epc & edt, ESV=72 is exceptionally
					// placed here.
					if( procCallWaitList[els.TID] != undefined ){
						if( els.ESV == '72' /* && els.OPC == '01'*/ ){
							procCallWaitList[els.TID](
								{epc:parseInt('0x'+epc),edt:edt
								, value:(edtConvFunc==undefined?undefined:edtConvFunc(edt))}) ;
							delete procCallWaitList[els.TID] ;
						}	// ESV == '52' is processed outside of epc loop.
					}

					if( bEdtUpdated && seoj!='0ef0' /*nodeprofile does not publish*/){
						pluginInterface.publish(mm.eoj_id_map[els.SEOJ] +'/'+epcType
							, {epc:parseInt('0x'+epc),edt:edt
							, value:(edtConvFunc==undefined?undefined:edtConvFunc(edt))} ) ;
					}
				}


				// Reply of SetC request
				if( procCallWaitList[els.TID] != undefined ){
					if( els.ESV == '71' ){	// accepted
						var epc_hex = els.DETAIL.slice(0,2) ;
						let epco ;
						if( ELDB[seoj] == undefined )	epco = ELDB['0000'].epcs[epc_hex] ;
						else 							epco = ELDB[seoj].epcs[epc_hex] ;
						var ret = {epc:parseInt('0x'+epc_hex) , epcName : epco.epcName , success:'SetC request accepted.'} ;
						var cache = tgt[epco.epcType] ;
						if( cache != null && cache.cache ){
							ret.cache_edt = cache.cache ;
							ret.cache_timestamp = cache.timestamp ;
							var convfuncs = epco.edtConvFuncs ;//|| ELDB['0000'].epcs[epc_hex].edtConvFuncs ;
							if( convfuncs != undefined )
								ret.cache_value = convfuncs[0](cache.cache) ;
						}
						procCallWaitList[els.TID](ret) ;
						delete procCallWaitList[els.TID] ;
					} else if( els.ESV == '51' || els.ESV == '52' ){	// cannot reply
						procCallWaitList[els.TID]({error:'Cannot complete the request.',els:els}) ;
						delete procCallWaitList[els.TID] ;
					}
				}

				savemac() ;

			}catch(e) {
				console.error("EL.renewFacilities error.");
				console.dir(e);
			}
		}).catch( ()=>{
			// Do nothing
			log('No MAC is found for ip '+ip);
		}) ;
	};

	function onReceiveGetRequest( ip, els ){
		try {
			let esv = EL.GET_RES ;
			const props = parseEDTs(els) ;
			for( let prop of props ){
				if( MY_PROPS[prop.epc] )
					prop.edt = MY_PROPS[prop.epc] ;
				else
					esv = EL.GET_SNA ;
				if( prop.edt == null || prop.edt.length == 0 )
					esv = EL.GET_SNA ;
			}
			sendFrame( ip, els.TID, els.DEOJ, els.SEOJ, esv, props );
		} catch(e){
			console.error("onReceiveGetRequest error.");
			console.dir(e);
		}
	}

	var elsocket = EL.initialize(
		[MY_EOJ.map(e=>('0'+e.toString(16)).slice(-2)).join('')] , ( rinfo, els , err ) => {
			if(err){ log("EL Error:\n"+JSON.stringify(err,null,"\t")); return; }
			if( els.DEOJ != '0ef000' && els.DEOJ != '0ef001' ){ // 0effxx has already been processed in echonet-lite npm
				if( els.ESV == EL.GET )
					onReceiveGetRequest(rinfo.address, els);
			}
		}) ;

	function searcher(){
		EL.search();
		if( --DEVICE_MULTICAST_INTITIAL_NUMBER > 0 )
			 setTimeout(searcher,DEVICE_MULTICAST_INITIAL_INTERVAL) ;
		else setInterval(()=>{EL.search();},DEVICE_MULTICAST_INTERVAL) ;
	}
	searcher() ;

	// Plugin must return (possibly in promise) procedure call callback function.
	// The signature is ( method , devid , propertyname , argument )
	return onProcCall ;
} ;

var procCallWaitList = {} ;

function getPropVal(devid,epc_hex){
	//log('GetPropVal:'+JSON.stringify(arguments)) ;
	return new Promise( (ac,rj)=>{
		var tid = localStorage.getItem('TransactionID',1)+1 ;
		if( tid > 0xFFFF ) tid = 1 ;
		localStorage.setItem('TransactionID',tid) ;

		const mac = getMacFromDeviceId(devid) ;
		const ip = macs[mac].ip ;
		const deoj = macs[mac].devices[devid].eoj ;
		deoj = [deoj.slice(0,2),deoj.slice(2,4),deoj.slice(-2)].map(e=>parseInt('0x'+e)) ;

		if( ip === IP_UNDEFINED || macs[mac].active !== true){
			rj({error: `${devid} is not active now.` });
			return ;
		}

		buffer = new Buffer([
			0x10, 0x81,
			(tid>>8)&0xff, tid&0xff,
			MY_EOJ[0], MY_EOJ[1], MY_EOJ[2],
			deoj[0], deoj[1], deoj[2],
			0x62,
			0x01,
			parseInt('0x'+epc_hex),
			0x00]);

		var tid_key = ('000'+tid.toString(16)).slice(-4) ;
		procCallWaitList[tid_key] = ac ;
		EL.sendBase( ip, buffer );	// Send main

		setTimeout(()=>{
			if( procCallWaitList[tid_key] == ac){
				delete procCallWaitList[tid_key] ;
				rj( {error:`GET request timeout:${devid}/${epc_hex}`} ) ;
			}
		},GET_TIMEOUT) ;
	}) ;
}

function setPropVal(devid,epc_hex,edt_array){
	//log('SetPropVal:'+JSON.stringify(arguments)) ;
	return new Promise( (ac,rj)=>{
		var tid = localStorage.getItem('TransactionID',1)+1 ;
		if( tid > 0xFFFF ) tid = 1 ;
		localStorage.setItem('TransactionID',tid) ;

		const mac = getMacFromDeviceId(devid) ;
		const ip = macs[mac].ip ;
		const deoj = macs[mac].devices[devid].eoj ;
		deoj = [deoj.slice(0,2),deoj.slice(2,4),deoj.slice(-2)].map(e=>parseInt('0x'+e)) ;

		if( ip === IP_UNDEFINED || macs[mac].active !== true){
			rj({error: `${devid} is not active now.` });
			return ;
		}

		buffer = new Buffer([
			0x10, 0x81,
			(tid>>8)&0xff, tid&0xff,
			MY_EOJ[0], MY_EOJ[1], MY_EOJ[2],
			deoj[0], deoj[1], deoj[2],
			0x61,	// SetC, instead of SetI
			0x01,
			parseInt('0x'+epc_hex),
			edt_array.length
			].concat(edt_array));

		var tid_key = ('000'+tid.toString(16)).slice(-4) ;
		procCallWaitList[tid_key] = ac ;
		EL.sendBase( ip, buffer );	// Send main

		setTimeout(()=>{
			if( procCallWaitList[tid_key] == ac){
				delete procCallWaitList[tid_key] ;
				rj( {error:`PUT request timeout:${devid}/${epc_hex}=>${JSON.stringify(edt_array)}`} ) ;
			}
		},GET_TIMEOUT) ;
	}) ;
}

function registerExistingDevice( devid ){
	var mac = getMacFromDeviceId(devid) ;
	var ip = macs[mac].ip ;
	var dev = macs[mac].devices[devid] ;

	if( dev.active === true ){
		log('Cannot register '+devid+' twice.') ;
		return ;
	}
	dev.active = true ;
	savemac() ;

	log(`Device ${devid}:${ip} registered.`) ;
}

function parseEDTs(els){
	const props = [] ;
	const array = EL.toHexArray( els.DETAIL ) ; //EDTs
	let now = 0 ;
	for( let i = 0; i< els.OPC; i++ ){
		const epc = array[now] ;
		now++ ;
		const pdc = array[now] ;
		now++ ;
		const edt = [] ;
		for( let j = 0; j < pdc; j++ ){
			edt.push(array[now]) ;
			now++ ;
		}
		props.push({'epc': EL.toHexString(epc), 'edt': EL.bytesToString(edt)}) ;
	}
	return props ;
}

// send echonet-lite frame with multiple properties
function sendFrame( ip, tid, seoj, deoj, esv, properties ){
	if( typeof(tid) == "string" ){
		tid = EL.toHexArray(tid) ;
	}

	if( typeof(seoj) == "string" ){
		seoj = EL.toHexArray(seoj) ;
	}

	if( typeof(deoj) == "string" ){
		deoj = EL.toHexArray(deoj) ;
	}

	if( typeof(esv) == "string" ){
		esv = (EL.toHexArray(esv))[0] ;
	}

	let propBuff = [];
	for( const prop of properties ){
		let epc = prop.epc ;
		if( typeof(epc) == "string" ){
			epc = (EL.toHexArray(epc))[0] ;
		}

		let edt = prop.edt ;
		if( typeof(edt) == "number" ){
			edt = [edt] ;
		}else if( typeof(edt) == "string" ){
			edt = EL.toHexArray(edt) ;
		}
		propBuff = propBuff.concat([epc, edt.length]) ;	// EPC, PDC
		propBuff = propBuff.concat(edt) ;				// EDT
	}

	var buffer;
	buffer = new Buffer([
		0x10, 0x81,
		tid[0], tid[1],
		seoj[0], seoj[1], seoj[2],
		deoj[0], deoj[1], deoj[2],
		esv,
		properties.length].concat(propBuff));
	EL.sendBase( ip, buffer ) ;
}

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///
///           Procedure call request
///


function onProcCall( method , path /*_devid , propname*/ , args ){
	let path_split = path.split('/') ;
	const _devid = path_split.shift() ;

	if( path_split.length>=2 ){ // Dirty code, just for compatibility
		method = path_split.pop().toUpperCase() ;
		if( args.edt == null )
			args.edt = args.value ;
	}
	const propname = path_split.join('/') ;

	if( _devid == '' || propname == '' ){
		switch(method){
		case 'GET' :
			return onProcCall_Get( method , _devid , propname , args ) ;
		case 'PUT' :
		case 'SET' :
			return onProcCall_Put( method , _devid , propname , args ) ;
		}
		return {error:`The specified method ${method} is not implemented in echonet lite plugin.`} ;
	}
	var devids = expandDeviceIdFromPossiblyRegExpDeviceId(
		decodeURIComponent(_devid)) ;
	switch(method){
	case 'GET' :
		return new Promise( (acpt,rjct)=>{
			Promise.all( devids.map(devid=>new Promise( (ac,rj)=>{
					Promise.all([onProcCall_Get( method , devid , propname , args )])
						.then( re=>{ ac([devid,re[0]]) ; }).catch(err=>{ac([devid,err]);}) ;
			})) ).then(re=>{
				var res = {} ;
				re.forEach(_re=>{
					var key = `/${VERSION}/${pluginInterface.getprefix()}/${_re[0]}/${propname}` ;
					res[key]=_re[1];
				}) ;
				acpt(res) ;
			})
		}) ;
	case 'PUT' :
	case 'SET' :
		return new Promise( (acpt,rjct)=>{
			Promise.all( devids.map(devid=>new Promise( (ac,rj)=>{
				Promise.all([onProcCall_Put( method , devid , propname , args )])
					.then( re=>{ ac([devid,re[0]]) ; }).catch(err=>{ac([devid,err]);}) ;
			})) ).then(re=>{
				var res = {} ;
				re.forEach(_re=>{
					var key = `/${VERSION}/${pluginInterface.getprefix()}/${_re[0]}/${propname}` ;
					res[key]=_re[1];
				}) ;
				acpt(res) ;
			}).catch(rjct);
		}) ;
		//return onProcCall_Put( method , devid , propname , args ) ;
	}
	return {error:`The specified method ${method} is not implemented in echonet lite plugin.`} ;
}

function onProcCall_Get( method , devid , propname , args ){
	if( devid == '' ){	// access 'echonet/' => device list
		var devices = {} ;

		for( var mac in macs ){
			for( var devid in macs[mac].devices ){
				var dev = macs[mac].devices[devid] ;
				devices[devid]={
					mac:mac
					,ip:macs[mac].ip
					,active: dev.active
					,eoj:dev.eoj
				} ;

				if( args.option === 'true'){
					devices[devid].option = {
						doc : {
							short : `EOJ:${dev.eoj} IP:${macs[mac].ip}`
							,long : (dev.active?'Active':'Inactive')+".\nMac address: "+mac
						}
						, leaf : false
					} ;
				}
			}
		}
		return devices ;
	}

	if( propname == '' ){	// access 'echonet/devid/' => property list
		// Ideally, property map should be checked.
		var mac = getMacFromDeviceId(devid) ;
		if( mac == undefined )	return {error:'No such device:'+devid} ;
		var dev = macs[mac].devices[devid] ;
		var eoj = dev.eoj.substring(0,4) ;
		var names ;
		if( args.option === 'true'){
			names = JSON.parse( fs.readFileSync(
				pluginInterface.getpath()+'all_'+LOCALE+'.json','utf-8')).names ;
		}

		var re = {} ;
		var cache_edt, cache_value, cacheStr , cache_timestamp ;
		/*// Super class
		if( eoj != '0ef0'){
			for( var epc in ELDB['0000'].epcs ){
				var epco = ELDB['0000'].epcs[epc] ;
				var epcType = epco.epcType ;
				cache_edt = cache_value = cacheStr = cache_timestamp = undefined ;
				if( dev[epcType] != undefined ){
					cache_edt = dev[epcType].cache ;
					cache_timestamp = dev[epcType].timestamp ;
				}
				// cache_value = undefined ;

				if( cache_edt != undefined && epco.edtConvFuncs != undefined && typeof epco.edtConvFuncs[0] == 'function' )
					cache_value = epco.edtConvFuncs[0](cache_edt) ;
				re[epcType] = {
					super : true
					, epc : parseInt('0x'+epc)
					, cache_edt : cache_edt , cache_value : cache_value , cache_timestamp : cache_timestamp
					, epcName : epco.epcName
				} ;

				if( names != undefined ){
					cacheStr = '' ;
					if( cache_value != undefined ) cacheStr = ' Cache:'+cache_value ;
					else if( cache_edt != undefined ) cacheStr = ' Cache:0x'+cache_edt.map(i=>('0'+i.toString(16)).slice(-2)).join('') ;
					re[epcType].option = {
						leaf : true
						,doc : {
							short : `${epco.epcName} EPC:${epc}`+cacheStr
							,long : (epco.epcDoc==undefined?undefined:names[epco.epcDoc])
						}
					}
				}
			}
		}*/

		let propMap = {} ;
		['StateChangeAnnouncementPropertyMap','SetPropertyMap','GetPropertyMap'].forEach(mname=>{
			if( dev[mname] && dev[mname].cache ){
				let c = dev[mname].cache ;
				if( c[0] >= 16 )
					c = EL.parseMapForm2(EL.bytesToString(c)) ;
				c.slice(1,1+c[0]).forEach(epc_d=>{
					propMap[epc_d.toString(16)] = null ;
				})
			}
		});

		for( let epc in propMap ){
			var epco = ELDB[eoj].epcs[epc] ;
			if( epco == null ) continue ;
			var epcType = epco.epcType ;
			cache_edt = cache_value = cacheStr = cache_timestamp = undefined ;
			if( dev[epcType] != undefined ){
				cache_edt = dev[epcType].cache ;
				cache_timestamp = dev[epcType].timestamp ;
			}
			//cache_value = undefined ;
			if( cache_edt != undefined && epco.edtConvFuncs != undefined && typeof epco.edtConvFuncs[0] == 'function' ){
				cache_value = epco.edtConvFuncs[0](cache_edt) ;
			} else if(re[epcType]!=undefined )
				cache_value = re[epcType].cache_value ;
			re[epcType] = {
				super : (epco.super === true)
				, epc : parseInt('0x'+epc)
				, cache_edt : cache_edt , cache_value : cache_value , cache_timestamp : cache_timestamp
				, epcName : epco.epcName
				//, epcDoc : (names==undefined||epco.epcDoc==undefined?undefined:names[epco.epcDoc])
			} ;

			if( names != undefined ){
				cacheStr = '' ;
				if( cache_value != undefined ) cacheStr = ' Cache:'+cache_value ;
				else if( cache_edt != undefined ) cacheStr = ' Cache:0x'+cache_edt.map(i=>('0'+i.toString(16)).slice(-2)).join('') ;
				re[epcType].option = {
					leaf : true
					,doc : {
						short : `${epco.epcName} EPC:${epc}`+cacheStr
						,long : (epco.epcDoc==undefined?undefined:names[epco.epcDoc])
					}
				} ;
				if( epco.test instanceof Array )
					re[epcType].option.test = epco.test ;
			}
		}

		delete names ;

		return re ;
	}

	var mac = getMacFromDeviceId(devid) ;
	if( mac == undefined )	return {error:'No such device:'+devid} ;

	var epc_hex ;
	var epcs = ELDB[macs[mac].devices[devid].eoj.slice(0,4)].epcs ;
	for( var epc in epcs ){
		if( propname === epcs[epc].epcType ){
			epc_hex = epc ;
			break ;
		}
	}
	if( epc_hex == undefined ){
		if(propname.length == 2 && !isNaN(parseInt('0x'+propname)))
			epc_hex = propname.toLowerCase() ;
		else if(!isNaN(parseInt(propname)))
			epc_hex = ('0'+(parseInt(propname)&0xff).toString(16)).slice(-2) ;
		else return {error:'Unknown property name:'+propname} ;
	}
	
	return getPropVal(devid,epc_hex) ;
}

function onProcCall_Put( method , devid , propname , args ){
	if( devid == '' || propname == '' || args==undefined || (args.value==undefined && args.edt == undefined ))
		return {error:`Device id, property name, and the argument "value" or "edt" must be provided for ${method} method.`} ;

	var mac = getMacFromDeviceId(devid) ;
	if( mac == undefined )	return {error:'No such device:'+devid} ;

	var epc_hex = undefined , edtConvFunc = undefined ;
	var eoj = macs[mac].devices[devid].eoj.slice(0,4) ;
	var epcs = ELDB[eoj].epcs ;
	for( var epc in epcs ){
		if( propname === epcs[epc].epcType ){
			epc_hex = epc ;
			break ;
		}
	}
	if( epc_hex == undefined ){
		if(propname.length == 2 && !isNaN(parseInt('0x'+propname)))
			epc_hex = propname.toLowerCase() ;
		else if(!isNaN(parseInt(propname)))
			epc_hex = ('0'+(parseInt(propname)&0xff).toString(16)).slice(-2) ;
		else return {error:'Unknown property name:'+propname} ;
	}

	if( epcs[epc_hex] != undefined && epcs[epc_hex].edtConvFuncs != undefined )
		edtConvFunc = epcs[epc_hex].edtConvFuncs[1] ;
	else if( eoj != '0ef0' ){
		var epco = ELDB['0000'].epcs[epc_hex] ;
		if( epco != undefined && epco.edtConvFuncs != undefined )
			edtConvFunc = epco.edtConvFuncs[1] ;
	}

	if( args.edt != null ){
		if( ! (args.edt instanceof Array) ){
			if( isNaN(args.edt) || !isFinite(args.edt) )
				return {error:'edt is not a number nor number array'} ;
			args.edt = [args.edt];
		}
	} else if(edtConvFunc != undefined){
		args.edt = edtConvFunc(args.value) ;
	} else
		return {error:'No converter to generate edt from value.'} ;

	return setPropVal(devid,epc_hex,args.edt) ;
}
