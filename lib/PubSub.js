// Simple on-memory PubSub
var log = ()=>{};//console.log ;

exports.PubSub = {
	topics : {}
	, sub : function(topic,callback){
		var topics = this.topics ;
		if( topics[topic] == undefined )
			topics[topic] = [callback] ;
		else if( topics[topic].indexOf(callback) == -1 )
			topics[topic].push(callback) ;
		log( 'Subscribe: '+topic) ;
	}
	, unsub : function(topic,callback){
		var topics = this.topics ;
		if( topics[topic] == undefined )	return ;
		var ci = topics[topic].indexOf(callback) ;
		if( ci == -1 ) return ;

		if( topics[topic].length == 1 )
			delete topics[topic] ;	// Delete topic
		else
			topics[topic].splice(ci,1) ;
		log('Unsubscribe:'+topic) ;
	}
	, unsuball : function(topic){
		delete this.topics[topic] ;	// Delete topic
	}
	, issub : function(topic){
		var topics = this.topics ;
		return (topics[topic] instanceof Array) && topics[topic].length>0 ;
	}
	, pub : function(topic,msg){
		var topics = this.topics ;
		if( topics[topic] != undefined )
			topics[topic].forEach(function(callback){ callback(msg) ; }) ;
		if( topics['.'] != undefined )	// Wildcard topic
			topics['.'].forEach(function(callback){ callback(msg) ; }) ;
		log('Publish:'+topic+'=>'+JSON.stringify(msg)) ;
	}
} ;