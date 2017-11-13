const PICOGW_PORT = 8080 ;

const fs = require('fs');

const RESRC_NAMES = ['Temperature','Luminosity'] ;

const PIPE_NAME = { // inverse of node.js side
    read:'v2/pipe_w'
    ,write:'v2/pipe_r'
};

const log = msg=>{console.log('[v2 conf] '+msg)} ;
function removeTailSlash(str){
    return str.slice(-1)=='/' ? str.slice(0,-1) : str ;
}





let resrc_ctxs = {} ;
//Initialize resrc_ctxs
RESRC_NAMES.forEach( rsn=>{ resrc_ctxs[rsn]={}; }) ;

module.exports = function(RED) {
    connectPipe() ;


    function picov2(config) {
        config.resource = removeTailSlash(config.resource) ;

        RED.nodes.createNode(this,config);
        const node = this ;
        const resource = config.resource ;
        const context = config.context ;
        const path = `${resource}/${context}` ;

        if( !(resrc_ctxs[resource][context] instanceof Array) )
            resrc_ctxs[resource][context] = [node] ;
        else
            resrc_ctxs[resource][context].push(node) ;

        node.on('input', function(msg) {
            if(msg.payload != null ) msg = msg.payload ;

            const ret = {
                method:msg.method
                ,reqid:msg.reqid
            } ;
            delete msg.method ;
            delete msg.reqid ;
            delete msg._msgid ;

            ret['/v2/'+path] = msg ;
            log('WStream.write:'+JSON.stringify(ret)) ;
            wstream.write(JSON.stringify(ret)+'\n') ;
        });

        node.on('close', function(msg) {
            resrc_ctxs[resource][context] = resrc_ctxs[resource][context].filter(n=>n!=node) ;
            if( resrc_ctxs[resource][context].length==0 )
                delete resrc_ctxs[resource][context] ;
        }) ;
    }
    RED.nodes.registerType("pico2 conf",picov2);
}

let wstream ;

function connectPipe(){
    function connect(){
        if( wstream == null ){
            //log(`connecting ${PIPE_NAME.read} and ${PIPE_NAME.write}`);

            Promise.all([
                // Open read stream
                new Promise((ac2,rj2)=>{
                    let rstream = fs.createReadStream(PIPE_NAME.read, 'utf-8');
                    rstream.on('error',e=>{
                        console.error('Pipe connection error:');
                        console.error(JSON.stringify(e));
                        rj2() ;
                    });
                    rstream.on('open', ()=>{
                        ac2() ;
                    });
                    rstream.on('close', ()=>{
                        log('Read pipe closed.') ;
                        rj2() ;
                    });

                    var readbuf = '' ;
                    rstream.on('data', data=>{
                        readbuf += data ;

                        var ri = readbuf.lastIndexOf("\n") ;
                        if( ri < 0 ) return ;
                        var focus = readbuf.slice(0,ri) ;
                        readbuf = readbuf.slice(ri+1) ;


                        try {
                            focus = JSON.parse(focus) ;
                            focus.path = removeTailSlash(focus.path).trim() ;
                            let ret = {reqid:focus.reqid} ;
                            if( focus.path == ''){
                                ret['/v2/'+focus.path] = {} ;
                                RESRC_NAMES.forEach(rsn=>{ret['/v2/'+focus.path][rsn]={};});
                                wstream.write(JSON.stringify(ret)+'\n') ;
                                return ;
                            }

                            let pathsplit = focus.path.split('/') ;
                            const resource = pathsplit[0] ;
                            if( resrc_ctxs[resource] == null ){
                                ret.error = 'No such resource: '+pathsplit[0] ;
                                wstream.write(JSON.stringify(ret)+'\n') ;
                                return ;
                            }
                            // Resource only (Asking contexts under resource)
                            if( pathsplit.length==1 ){
                                ret['/v2/'+focus.path] = {} ;
                                for( const context in resrc_ctxs[resource] )
                                    ret['/v2/'+resource][context] = [] ;
                                wstream.write(JSON.stringify(ret)+'\n') ;
                                return ;
                            }

                            const context = pathsplit[1] ;

                            if( resrc_ctxs[resource][context] == null ){
                                ret.error = 'No such resource: '+pathsplit[0] ;
                                wstream.write(JSON.stringify(ret)+'\n') ;
                                return ;
                            }

                            //log('onData:'+JSON.stringify(focus)) ;
                            if( resrc_ctxs[resource][context] instanceof Array ){
                                resrc_ctxs[resource][context].forEach(n=>{
                                    switch( focus.method ){
                                    case 'GET': n.send([focus,null]) ; break ;
                                    case 'PUT': n.send([null,focus,null]) ; break ;
                                    case 'DELETE': n.send([null,null,focus]) ; break ;
                                    }
                                }) ;
                            } else {
                                ret.error = 'No such path: /v2/'+focus.path ;
                                wstream.write(JSON.stringify(ret)+'\n') ;
                            }
                        } catch(e){}
                    });
                })

                // Open write stream
                ,new Promise((ac2,rj2)=>{
                    // Write stream setup
                    wstream = fs.createWriteStream(PIPE_NAME.write, 'utf-8');
                    wstream .on('drain', ()=>{})
                        .on('open',()=>{
                            ac2() ;
                        })
                        .on('error', e=>{
                            console.error('Pipe connection error:');
                            console.error(JSON.stringify(e));
                        })
                        .on('close', ()=>{
                            log('Write pipe closed.');
                        }) ;
                })
            ]).then(()=>{
                log('Connected to PicoGW v2 API manager.');
            }).catch(()=>{}) ;
	   }
    }

    connect() ;
}