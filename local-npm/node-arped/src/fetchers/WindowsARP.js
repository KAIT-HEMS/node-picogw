import ARP from './ARP';
import ChildProcess from 'child_process'

export default class WindowsARP extends ARP {
    constructor() {
        super();
    }

    fetch() {
        var result = _child_process2.default.spawnSync('arp', ['-a']);
        if (result.error) {
            throw error;
        }
  //            return result.stdout.toString();
        const lines = result.stdout.toString().split('\n');

        const NetIDRegex = /0x([0-9a-fA-F])+/;
        const IPv4Regex = /([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/;

        const netprefix = 'en' ;
        let interf_id = netprefix+'-1';

        let ret = [] ;
        lines.forEach(line=>{
          line = line.trimRight() ;
          if( line.match(/^ /) ){
            if( !IPv4Regex.exec(line) ) return ;
            ret.push(line+'  '+interf_id) ;
            return ;
          }
          let NetIDResult = NetIDRegex.exec(line);
          if( NetIDResult == null ) return ;
          interf_id = netprefix + NetIDResult[0].slice(2) ;
        });

        return ret.join('\r\n') ;
    }
}
