import ARP from './ARP';
import FS from 'fs';

export default class LinuxARP extends ARP {
    constructor() {
        super();
    }

    fetch() {
        const arpPath = '/proc/net/arp';

        if (!FS.existsSync(arpPath)) {
            throw new Error(`Expected ARP table at: ${arpPath} but it did not exist.`);
        }

        return FS.readFileSync(arpPath).toString();
    }
}
