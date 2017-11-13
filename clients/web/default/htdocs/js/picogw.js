// Websocket connection
/*
Initialize:
	connectws( {
		onconnect : function(picogw){	// Initialized callback can called multiple times if disconnected
		}
		, ondisconnect : function(picogw){	// Initialized callback can called multiple times if disconnected
		}
		, hostname : '' // (Optional) IP address or hostname of the picogw server
	}) ;

CallProc:
	picogw.callproc({
		method: "PUT"
		,path: "/v1/echonet/GenericIllumination_2/OperatingState/"
		,args: {value:'off'}
	}).then(re=>{
		console.log('Return:') ;
		console.log(re) ;
	})

Subscribe:
	picogw.sub(
		'/v1/echonet/GenericIllumination_1/OperatingState/'
		,re=>{console.log('Published!');console.log(re);}
	) ;

Unsubscribe:
	// Unsub all handlers related to the path
	picogw.unsub('/v1/echonet/GenericIllumination_1/OperatingState/');

	// Unsub only one handler
	picogw.unsub('/v1/echonet/GenericIllumination_1/OperatingState/',func);
*/



function connectws( arg1,arg2,arg3 ){
	let onconnect_func , ondisconnect_func , hostname ;
	if( typeof arg1 == 'object' ){
		onconnect_func = arg1.onconnect ;
		ondisconnect_func = arg1.ondisconnect ;
		hostname = arg1.hostname ;
	} else {
		onconnect_func = arg1 ;
		ondisconnect_func = arg2 ;
		hostname = arg3 ;
	}
	if( onconnect_func == null ) onconnect_func = ()=>{} ;
	if( ondisconnect_func == null ) ondisconnect_func = ()=>{} ;
	if( hostname == null ) hostname = location.host ;

    console.log('Trying to connect to '+hostname+'...') ;
	start_spinner();

    let connection = new WebSocket('ws://'+hostname ,['picogw']);

    let tid = 0 ;
    let waitlist = {} ;
    let sublist = {} ;

	connection.onopen = function () {
		let picogw = {
			callproc : args=>{
				return new Promise((ac,rj)=>{
					if( typeof args == 'string' )
						args = {method:'GET',path:args /*,args:{}*/} ;
					args.tid = tid ;
					waitlist[tid] = [ac,rj] ;
					tid++ ;
					connection.send(JSON.stringify(args)) ;
				});
			}
			, sub : (path,callback) => {
				if( path.slice(-1) == '/') path = path.slice(0,-1) ;
				if( sublist[path] == undefined ){
					sublist[path]={
						single_callback : function(re){
							this.callbacks.forEach(cb=>{cb(re);}) ;
						}
						, callbacks : []
					} ;
					connection.send(JSON.stringify({ method:'SUB',path:path,tid:4649 })) ;
				}
				if( sublist[path].callbacks.indexOf(callback)<0)
					sublist[path].callbacks.push(callback) ;
			}
			, unsub : (_path,callback) => {
				function unsubmain(path){
					if( path.slice(-1) == '/') path = path.slice(0,-1) ;
					if( sublist[path]==undefined ) return ;
					if( callback != undefined ){
						let pos = sublist[path].callbacks.indexOf(callback) ;
						if( pos >= 0)
							sublist[path].callbacks.splice( pos,1 ) ;
					}
					if( callback == undefined || sublist[path].callbacks.length == 0){
						connection.send(JSON.stringify({method:'UNSUB',path:path})) ;
						delete sublist[path] ;
					}
				}
				if(_path != null) unsubmain(_path) ;
				else for( _path in sublist )
					unsubmain(_path) ;
			}
		}
		stop_spinner();
	    console.log('Connected to '+location.host+'.') ;
		onconnect_func(picogw) ;
	};
	connection.onmessage = function (e) {
		//console.log('Server: ' + JSON.stringify(JSON.parse(e.data),null,"\t")) ;
		try {
			let ret = JSON.parse(e.data) ;
			if( ret.method == 'PUB'){
				for( let path in ret )
					if( sublist[path] != undefined )
						sublist[path].single_callback(ret) ;
			} else if( waitlist[ret.tid] != undefined ){
				let tid = ret.tid ;
				delete ret.tid ;
				waitlist[tid][0](ret) ;
				delete waitlist[ret.tid] ;
			}
		} catch(e){
			console.error(e) ;
		}
	};

	/*connection.onerror = function(){
		start_spinner();
	} ;*/
	connection.onclose = function(){
		start_spinner();
		for( let tid in waitlist )
			waitlist[tid][1]({error:'Connection closed.'}) ;
    	waitlist = {} ;
    	sublist = {} ;
    	//picogw = undefined ;
		console.log('Websocket disconnected. Retrying in 3 secs.') ;
		setTimeout(()=>{
			connectws({
				onconnect : onconnect_func
				, ondisconnect : ondisconnect_func
				, hostname : hostname
			}) ;
		},3000) ;
	}
} ;

let spinner ;
function start_spinner(){
	if( spinner != undefined ) return ;
	spinner = new Spinner().spin() ;
	document.getElementsByTagName('body')[0].appendChild(spinner.el);
}
function stop_spinner(){
	if( spinner == undefined ) return ;
	document.getElementsByTagName('body')[0].removeChild(spinner.el);
	spinner = undefined ;
}

// http://spin.js.org/#v2.3.2
!function(a,b){"object"==typeof module&&module.exports?module.exports=b():"function"==typeof define&&define.amd?define(b):a.Spinner=b()}(this,function(){"use strict";function a(a,b){var c,d=document.createElement(a||"div");for(c in b)d[c]=b[c];return d}function b(a){for(var b=1,c=arguments.length;c>b;b++)a.appendChild(arguments[b]);return a}function c(a,b,c,d){var e=["opacity",b,~~(100*a),c,d].join("-"),f=.01+c/d*100,g=Math.max(1-(1-a)/b*(100-f),a),h=j.substring(0,j.indexOf("Animation")).toLowerCase(),i=h&&"-"+h+"-"||"";return m[e]||(k.insertRule("@"+i+"keyframes "+e+"{0%{opacity:"+g+"}"+f+"%{opacity:"+a+"}"+(f+.01)+"%{opacity:1}"+(f+b)%100+"%{opacity:"+a+"}100%{opacity:"+g+"}}",k.cssRules.length),m[e]=1),e}function d(a,b){var c,d,e=a.style;if(b=b.charAt(0).toUpperCase()+b.slice(1),void 0!==e[b])return b;for(d=0;d<l.length;d++)if(c=l[d]+b,void 0!==e[c])return c}function e(a,b){for(var c in b)a.style[d(a,c)||c]=b[c];return a}function f(a){for(var b=1;b<arguments.length;b++){var c=arguments[b];for(var d in c)void 0===a[d]&&(a[d]=c[d])}return a}function g(a,b){return"string"==typeof a?a:a[b%a.length]}function h(a){this.opts=f(a||{},h.defaults,n)}function i(){function c(b,c){return a("<"+b+' xmlns="urn:schemas-microsoft.com:vml" class="spin-vml">',c)}k.addRule(".spin-vml","behavior:url(#default#VML)"),h.prototype.lines=function(a,d){function f(){return e(c("group",{coordsize:k+" "+k,coordorigin:-j+" "+-j}),{width:k,height:k})}function h(a,h,i){b(m,b(e(f(),{rotation:360/d.lines*a+"deg",left:~~h}),b(e(c("roundrect",{arcsize:d.corners}),{width:j,height:d.scale*d.width,left:d.scale*d.radius,top:-d.scale*d.width>>1,filter:i}),c("fill",{color:g(d.color,a),opacity:d.opacity}),c("stroke",{opacity:0}))))}var i,j=d.scale*(d.length+d.width),k=2*d.scale*j,l=-(d.width+d.length)*d.scale*2+"px",m=e(f(),{position:"absolute",top:l,left:l});if(d.shadow)for(i=1;i<=d.lines;i++)h(i,-2,"progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)");for(i=1;i<=d.lines;i++)h(i);return b(a,m)},h.prototype.opacity=function(a,b,c,d){var e=a.firstChild;d=d.shadow&&d.lines||0,e&&b+d<e.childNodes.length&&(e=e.childNodes[b+d],e=e&&e.firstChild,e=e&&e.firstChild,e&&(e.opacity=c))}}var j,k,l=["webkit","Moz","ms","O"],m={},n={lines:12,length:7,width:5,radius:10,scale:1,corners:1,color:"#000",opacity:.25,rotate:0,direction:1,speed:1,trail:100,fps:20,zIndex:2e9,className:"spinner",top:"50%",left:"50%",shadow:!1,hwaccel:!1,position:"absolute"};if(h.defaults={},f(h.prototype,{spin:function(b){this.stop();var c=this,d=c.opts,f=c.el=a(null,{className:d.className});if(e(f,{position:d.position,width:0,zIndex:d.zIndex,left:d.left,top:d.top}),b&&b.insertBefore(f,b.firstChild||null),f.setAttribute("role","progressbar"),c.lines(f,c.opts),!j){var g,h=0,i=(d.lines-1)*(1-d.direction)/2,k=d.fps,l=k/d.speed,m=(1-d.opacity)/(l*d.trail/100),n=l/d.lines;!function o(){h++;for(var a=0;a<d.lines;a++)g=Math.max(1-(h+(d.lines-a)*n)%l*m,d.opacity),c.opacity(f,a*d.direction+i,g,d);c.timeout=c.el&&setTimeout(o,~~(1e3/k))}()}return c},stop:function(){var a=this.el;return a&&(clearTimeout(this.timeout),a.parentNode&&a.parentNode.removeChild(a),this.el=void 0),this},lines:function(d,f){function h(b,c){return e(a(),{position:"absolute",width:f.scale*(f.length+f.width)+"px",height:f.scale*f.width+"px",background:b,boxShadow:c,transformOrigin:"left",transform:"rotate("+~~(360/f.lines*k+f.rotate)+"deg) translate("+f.scale*f.radius+"px,0)",borderRadius:(f.corners*f.scale*f.width>>1)+"px"})}for(var i,k=0,l=(f.lines-1)*(1-f.direction)/2;k<f.lines;k++)i=e(a(),{position:"absolute",top:1+~(f.scale*f.width/2)+"px",transform:f.hwaccel?"translate3d(0,0,0)":"",opacity:f.opacity,animation:j&&c(f.opacity,f.trail,l+k*f.direction,f.lines)+" "+1/f.speed+"s linear infinite"}),f.shadow&&b(i,e(h("#000","0 0 4px #000"),{top:"2px"})),b(d,b(i,h(g(f.color,k),"0 0 1px rgba(0,0,0,.1)")));return d},opacity:function(a,b,c){b<a.childNodes.length&&(a.childNodes[b].style.opacity=c)}}),"undefined"!=typeof document){k=function(){var c=a("style",{type:"text/css"});return b(document.getElementsByTagName("head")[0],c),c.sheet||c.styleSheet}();var o=e(a("group"),{behavior:"url(#default#VML)"});!d(o,"transform")&&o.adj?i():j=d(o,"animation")}return h});