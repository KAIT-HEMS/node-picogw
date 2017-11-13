/*eslint-env mocha */
/*eslint-disable no-unused-expressions*/
'use strict';

import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import FS from 'fs';

chai.use(sinonChai);

const Parser = require('../src/parsers/Parser').default;
const MacOSParser = require('../src/parsers/MacOSParser').default;
const FixturesPath = './test/fixtures/';

describe('Parser', () => {
    let fixtures = {},
        parser,
        sandbox;

    before(() => {
        sandbox = sinon.sandbox.create();

        let files = FS.readdirSync(FixturesPath);
        files.forEach((file) => {
            fixtures[file] = FS.readFileSync(`${FixturesPath}${file}`).toString();
        });
    });

    beforeEach(() => {
        parser = new Parser();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('parse', () => {
        it('should throw an Error if not passed a table to parse', () => {
            return expect(() => {
                parser.parse();
            }).to.throw(`Missing table to parse`);
        });

        it('should throw an Error if passed an empty string as a table', () => {
            return expect(() => {
                parser.parse('');
            }).to.throw(`Missing table to parse`);
        });

        it('should throw an Error if passed a number as a table', () => {
            return expect(() => {
                parser.parse(99);
            }).to.throw(`Missing table to parse`);
        });

        it('should throw an Error if passed a boolean as a table', () => {
            return expect(() => {
                parser.parse(true);
            }).to.throw(`Missing table to parse`);
        });

        it('should throw an Error if the passed table has no rows', () => {
            return expect(() => {
                parser.parse("A B C D");
            }).to.throw(`Table has only one row`);
        });

        it('should return a results object when parsing is successful', () => {
            let result = parser.parse(fixtures['LinuxARP-Simple.txt']);

            return expect(result).to.deep.equal({
                Devices: {
                    eth0: {
                        IPs: {
                            '192.168.0.1': '00:aa:22:bb:33:cc'
                        },
                        MACs: {
                            '00:aa:22:bb:33:cc': '192.168.0.1'
                        }
                    }
                }
            });
        });

        it('should parse multiple Devices', () => {
            let result = parser.parse(fixtures['LinuxARP-DualInterface.txt']);

            return expect(result).to.deep.equal({
                Devices: {
                    eth0: {
                        IPs: {
                            '192.168.0.1': '00:aa:22:bb:33:cc'
                        },
                        MACs: {
                            '00:aa:22:bb:33:cc': '192.168.0.1'
                        }
                    },
                    eth1: {
                        IPs: {
                            '192.168.0.2': '11:bb:33:cc:44:dd'
                        },
                        MACs: {
                            '11:bb:33:cc:44:dd': '192.168.0.2'
                        }
                    }
                }
            });
        });

        it('should parse multiple entries on a single interface', () => {
            let result = parser.parse(fixtures['LinuxARP-MultipleOnSingle.txt']);

            return expect(result).to.deep.equal({
                Devices: {
                    eth0: {
                        IPs: {
                            '192.168.0.1': '00:aa:22:bb:33:cc',
                            '192.168.0.2': '11:bb:33:cc:44:dd',
                            '192.168.0.3': '22:cc:44:dd:55:ee'
                        },
                        MACs: {
                            '00:aa:22:bb:33:cc': '192.168.0.1',
                            '11:bb:33:cc:44:dd': '192.168.0.2',
                            '22:cc:44:dd:55:ee': '192.168.0.3'
                        }
                    }
                }
            });
        });

        it('should parse multiple entries on a multiple interfaces', () => {
            let result = parser.parse(fixtures['LinuxARP-MultipleOnDual.txt']);
            
            return expect(result).to.deep.equal({
                Devices: {
                    eth0: {
                        IPs: {
                            '192.168.0.1': '00:aa:22:bb:33:cc',
                            '192.168.0.2': '11:bb:33:cc:44:dd',
                            '192.168.0.3': '22:cc:44:dd:55:ee'
                        },
                        MACs: {
                            '00:aa:22:bb:33:cc': '192.168.0.1',
                            '11:bb:33:cc:44:dd': '192.168.0.2',
                            '22:cc:44:dd:55:ee': '192.168.0.3'
                        }
                    },
                    eth1: {
                        IPs: {
                            '192.168.0.4': '33:dd:55:ee:66:ff',
                            '192.168.0.5': '44:ee:66:ff:77:aa',
                            '192.168.0.6': '55:ff:77:aa:88:bb'
                        },
                        MACs: {
                            '33:dd:55:ee:66:ff': '192.168.0.4',
                            '44:ee:66:ff:77:aa': '192.168.0.5',
                            '55:ff:77:aa:88:bb': '192.168.0.6'
                        }
                    }
                }
            });
        });

        it('should parse starndard entries on macOS', () => {
            let result = new MacOSParser().parse(fixtures['MacOSARP-Starndard.txt']);
            return expect(result).to.deep.equal({
                Devices: {
                    en0: {
                        IPs: {
                            '192.168.0.1': '00:01:02:0a:0b:0c',
                            '192.168.0.2': '00:aa:22:bb:33:cc'
                        },
                        MACs: {
                            '00:01:02:0a:0b:0c': '192.168.0.1',
                            '00:aa:22:bb:33:cc': '192.168.0.2',
                        }
                    },
                    en1: {
                        IPs: {
                            '192.168.0.3': '11:bb:33:cc:44:dd'
                        },
                        MACs: {
                            '11:bb:33:cc:44:dd': '192.168.0.3'
                        }
                    }
                }
            });
        });

        it('should parse starndard entries on Windows', () => {
            let result = parser.parse(fixtures['WindowsARP-Standard.txt']);
            return expect(result).to.deep.equal({
                Devices: {
                    en0: {
                        IPs: {
                            '192.168.0.1': '00:01:02:0a:0b:0c',
                            '192.168.0.2': '00:aa:22:bb:33:cc',
                            '192.168.0.3': '11:bb:33:cc:44:dd'
                        },
                        MACs: {
                            '00:01:02:0a:0b:0c': '192.168.0.1',
                            '00:aa:22:bb:33:cc': '192.168.0.2',
                            '11:bb:33:cc:44:dd': '192.168.0.3'
                        }
                    }
                }
            });
        });
    });
});
