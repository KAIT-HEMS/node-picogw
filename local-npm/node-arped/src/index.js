import GenericARP from './fetchers/GenericARP';
import LinuxARP from './fetchers/LinuxARP';
import MacOSARP from './fetchers/MacOSARP';
import WindowsARP from './fetchers/WindowsARP';
import ARPParser from './parsers/Parser';
import MacOSParser from './parsers/MacOSParser';

export default class Arped {
    constructor() {
        if (/linux/.test(process.platform)) {
            this.arpFetcher = new LinuxARP();
        } else if (/darwin/.test(process.platform)) {
            this.arpFetcher = new MacOSARP();
        } else if (/^win/.test(process.platform)) {
            this.arpFetcher = new WindowsARP();
        } else {
            this.arpFetcher = new GenericARP();
        }

        if (/darwin/.test(process.platform)) {
            this.arpParser = new MacOSParser();
        } else {
            this.arpParser = new ARPParser();
        }
    }

    table() {
        return this.arpFetcher.fetch();
    }

    parse(table) {
        return this.arpParser.parse(table);
    }
}
