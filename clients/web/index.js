try {
	exports.init = require('./custom/index.js').init ;
} catch(e){
	exports.init = require('./default/index.js').init ;
} ;
