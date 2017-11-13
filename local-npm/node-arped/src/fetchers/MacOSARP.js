import ARP from './ARP';
import ChildProcess from 'child_process'

export default class MacOSARP extends ARP {
    constructor() {
        super();
    }

    fetch() {
        const result = ChildProcess.spawnSync('arp', ['-an']);
        if (result.error) {
            throw error;
        }
        return result.stdout.toString();
    }
}
