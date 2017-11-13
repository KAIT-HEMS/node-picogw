 let urlVars = {} ;
if( location.search.length>0 ){
	let eqs = location.search.substring(1).split('&') ;
	eqs.forEach(function(eq){
		let terms = eq.split('=') ;
		urlVars[terms[0]]=(terms.length<2?null:terms[1]) ;
	}) ;
}


let picogw ;
//let bInitialized = false ;
let devices ;

const DescriptionProperties = ['OperatingState','InstallationLocation','ManufacturerCode'] ;

onload = function(){
	const POLL_INTERVAL = 10*1000 ;

	if( urlVars.ip == null ){
		$('#mainpage-body').html('<div align="center"><h2>PicoGW IP address should be specified.</h2></div>') ;
		$('#mainpage').page() ;
		return ;
	}

	let timer_id ;

	connectws({
		onconnect : _picogw=>{
			picogw = _picogw ;

			//if( bInitialized ) return ;
			//bInitialized = true ;

			// Search echonet lite aircons
			const pathprefix = '/v1/echonet' ;
			start_spinner();
			picogw.callproc({
				method:'GET'
				,path: pathprefix
			}).then(devhash=>{
				stop_spinner();
				let devlist = [] ;
				for( let dev in devhash ){
					if( dev.indexOf(DevNamePrefix) == 0 )
						devlist.push(dev) ;
				}
				if( devlist.length == 0 )	return ;

				devices = {} ;
				start_spinner();
				Promise.all(devlist.map(dev=>new Promise((ac,rj)=>{
					picogw.callproc({
						method:'GET'
						,path: pathprefix+'/'+dev
					}).then(cache=>{
						devices[pathprefix+'/'+dev] = cache ;
						ac() ;
					}).catch(e=>{
						ac() ;
					});
				}))).then(()=>{
					stop_spinner();
					let ht = '' ;
					for( let path in devices ){
						let desc = '' ;
						DescriptionProperties.forEach(elem=>{
							try {
								desc += ` ${elem} = ${devices[path][elem].cache_value} :`
							} catch(e){}
						}) ;

						ht += `<li><a href="#controlpage" onclick="on_dev_selected('${path}')">`
							+`<img src="${IconURL}"></img><h2>${path.split('/').slice(-1)[0]}</h2>`
							+`<p>${desc.slice(0,-1)}</p>`	 // Remove last ','
							+`</a></li>` ;
					} ;

					$('#devlist').html(ht).listview('refresh');


					// Cache update GETs
					if( NoAnnounceProperties instanceof Array && NoAnnounceProperties.length>0 ){
						if( timer_id != null ) clearInterval(timer_id) ;
						timer_id = setInterval(()=>{
							let promises = [] ;
							for( let path in devices ){
								NoAnnounceProperties.forEach(pname=>{
									promises.push(
										picogw.callproc({
											method:'GET'
											,path: path+'/'+pname
										})
									) ;
								}) ;
							}

							Promise.all(promises).catch(console.error) ;
						},POLL_INTERVAL) ;
					}
				}).catch(e=>{stop_spinner();}) ;
			}).catch(e=>{
				stop_spinner();
				$('#mainpage-body').html('Error in searching /v1/echonet/'+DevNamePrefix) ;
				$('#mainpage').page();
			}) ;
		}
		, ondisconnect : ()=>{
			if(timer_id) clearInterval(timer_id) ;
			timer_id = undefined ;
		}
		, hostname : urlVars.ip
	}) ;
} ;

function simple_enum_setup(dev_path,propname,cache){
	let prev_cval ;

	function handler(newval){
		start_spinner();
		picogw.callproc({
			method:'PUT'
			,path:dev_path+'/'+propname
			,args:{value:newval}
		}).then(re=>{stop_spinner();console.log(re);}).catch(e=>{stop_spinner();});
		prev_cval = newval ;
		//console.log(`${propname} : ${newval}`) ;
	} ;

	if( cache == null ){
		$(`#${propname} input[type='radio']`).checkboxradio('disable');
		return handler ;
	}
	prev_cval = cache.cache_value ;

	$(`#${propname}-${prev_cval}`).attr('checked','checked') ;
	$(`label[for='${propname}-${prev_cval}']`).addClass('ui-btn-active') ;
	//$(`#${propname}-${prev_cval}`).removeAttr('checked') ;

	picogw.sub(dev_path+'/'+propname,re=>{
		let cval = re[dev_path+'/'+propname].value ;
		$(`label[for='${propname}-${prev_cval}']`).removeClass('ui-btn-active') ;
		$(`label[for='${propname}-${cval}']`).addClass('ui-btn-active') ;
		prev_cval = cval ;
		//$('#controlpage').page();
	});

	// Set handler
	return handler ;
}

function slider_setup(dev_path,propName,cache){
	if( cache != null ){
		$(`#${propName}`).attr('value',cache.cache_value) ;
		$(`#${propName}`).slider('refresh') ;
	} else
		$(`#${propName}`).slider('disable');

	picogw.sub(dev_path+'/'+propName,re=>{
		$(`#${propName}`).val(re[dev_path+'/'+propName].value).slider('refresh');
	});

	// Set handler
	return newval=>{
		start_spinner();
		picogw.callproc({
			method:'PUT'
			,path:dev_path+'/'+propName
			,args:{value:newval}
		}).then(re=>{stop_spinner();console.log(re);}).catch(e=>{stop_spinner();});
		prev_cval = newval ;
		console.log(`${propName} : ${newval}`) ;
	} ;
}

const set_handlers = {} ;

on_dev_selected = dev_path =>{
	localStorage.setItem('dev_path',dev_path) ;
}

$("#controlpage").on("pagehide",function(event) {
	picogw.unsub() ;
}) ;
$("#controlpage").on("pagebeforeshow",function(event) {
	let dev_path = localStorage.getItem('dev_path') ;
	function setupControls(){
		let devCache = devices[dev_path] ;

		// Simple enum properties
		SimpleEnumProperties.forEach(pname=>{
			set_handlers[pname] = simple_enum_setup(dev_path,pname,devCache[pname]) ;
		}) ;

		// Slider properties
		SliderProperties.forEach(pname=>{
			set_handlers[pname] = slider_setup(dev_path,pname,devCache[pname]) ;
		}) ;
	}

	if( devices != null ) setupControls() ;
	else {
		let iid = setInterval(()=>{
			if( devices == null ) return ;
			clearInterval(iid) ;
			setupControls() ;
		},1000) ;
	}
});

$(document).on('change', '[type="radio"]', function(){ 
	try {
		set_handlers[this.name](this.value) ;
	} catch(e){}
});

SliderProperties.forEach(pname=>{
	$('#frm').on('slidestop','#'+pname, function(){ 
		try {
			set_handlers[this.name](parseInt(this.value)) ;
		} catch(e){}
	});
});
