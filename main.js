// PicoGW = Minimalist's Home Gateway
const controller = require('./lib/controller');
const PubSub = require('./lib/pub-sub').PubSub;
const log = console.log;

const package_json = require('./package.json');
log(`PicoGW \u001b[31mv${package_json.version}\u001b[0m`);

// Support for termux
if (process.platform == 'android') {
    Object.defineProperty(process, 'platform', {get: function() {
        return 'linux';
    }});
}

/////////////////////////////
// Parse command line

// Plugin specific argument definition:
//  --plugin_args_echonet A=B

let pluginArgs ;
(()=>{
	let newargv = [];
	let ActivePluginArgs ;
	for( let ai=0;ai<process.argv.length;++ai ){
		//console.log(`Argument ${ai+1} : ${process.argv[ai]}`);
		if( ActivePluginArgs != null ){
			const eqs = process.argv[ai].split('=');
			if( eqs.length==2 ){
				ActivePluginArgs[eqs[0]] = eqs[1];
				ActivePluginArgs = null;
			}
			continue;
		}

		const prefix = '--plugin-args-';
		if( process.argv[ai].indexOf(prefix)==0 ){
			const pluginName = process.argv[ai].slice( prefix.length);
			if( pluginArgs == null ) pluginArgs = {};

			if( pluginArgs[pluginName]==null )
				pluginArgs[pluginName] = {};
			ActivePluginArgs = pluginArgs[pluginName];
			continue;
		}
		newargv.push(process.argv[ai]);
	}
	process.argv = newargv;
})();


let cmdOpts = require('opts');
cmdOpts.parse([
    {
        'short': 'c',
        'long': 'config',
        'description': 'Path of config file.'
            + ' The default is "config.json" in $HOME/.picogw/config.json or ./config.json', // eslint-disable-line max-len
        'value': true,
        'required': false,
    },
    {
        'short': 'p',
        'long': 'port',
        'description': 'Web API port number. The default is 8080.',
        'value': true,
        'required': false,
    },
    {
        'long': 'pipe',
        'description': 'Path of named pipes without postfix (_r or _w).'
            + ' The server is blocked until the pipe client is connected.',
        'value': true,
        'required': false,
    },
], true);

if( pluginArgs != null )
	cmdOpts.plugin_args = pluginArgs;

controller.init({PubSub: PubSub, cmd_opts: cmdOpts }).then((re)=>{
    log('Plugins have been initialized.');
}).catch((e) => {
    console.error(e);
});

log('PicoGW started.');
