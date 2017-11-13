// PicoGW = Minimalist's Home Gateway
var fs = require('fs');

const VERSIONS = ['v1','v2'] ;
var VERSION_CTRLS = {} ;	// Stores controller objects
var log = console.log ;

// Support for termux
if( process.platform == 'android' )
	Object.defineProperty(process, "platform", { get: function () { return 'linux'; } });

// Parse command line
var cmd_opts = require('opts');
cmd_opts.parse([
    {
        'short': 'p',
        'long': 'port',
        'description': 'Web API port number',
        'value': true,
        'required': false
    },
    {
        'long': 'pipe',
        'description': 'path of named pipes without postfix (_r or _w). The server is blocked until the pipe client is connected.',
        'value': true,
        'required': false
    },
],true);

// Start clients
const PubSub = require('./clients/PubSub.js').PubSub ;
const client = require('./clients/index.js') ;
client.init( { VERSIONS:VERSIONS,VERSION_CTRLS:VERSION_CTRLS,PubSub:PubSub,cmd_opts:cmd_opts } ).catch(e=>{
    console.error('Client initialization failed: '+e) ;
})


// Initialize each versions and store controller objects into VERSION_CTRLS
VERSIONS.forEach(VERSION=>{
    var ctrl = require('./'+VERSION+'/controller.js') ;
    ctrl.init({PubSub:PubSub,cmd_opts:cmd_opts},client.clientFactory).then(re=>{
        log('API version '+VERSION+' initialized.') ;
    }).catch(console.error) ;
    VERSION_CTRLS[VERSION] = ctrl ;
}) ;

console.log('PicoGW started.') ;

// Omit shell disconnection at Starbucks
//setInterval(()=>{log(Date.now());},10000) ;
