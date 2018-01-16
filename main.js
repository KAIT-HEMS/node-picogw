// PicoGW = Minimalist's Home Gateway
const controller = require('./lib/controller');
const PubSub = require('./lib/pub-sub').PubSub;
const log = console.log;

// Support for termux
if (process.platform == 'android') {
    Object.defineProperty(process, 'platform', {get: function() {
        return 'linux';
    }});
}

// Parse command line
let cmdOpts = require('opts');
cmdOpts.parse([
    {
        'short': 'c',
        'long': 'config',
        'description': 'Path of config file.'
            + ' The default is "config.json" in $HOME/.picogw/config.json or ./config.json',
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


controller.init({PubSub: PubSub, cmd_opts: cmdOpts}).then((re)=>{
    log('Plugins have been initialized.');
}).catch((e) => {
    console.error(e);
});

log('PicoGW started.');
