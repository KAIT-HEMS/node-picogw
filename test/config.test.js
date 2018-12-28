const fs = require('fs');
const expect = require('chai').expect;
const Config = require('../lib/config');

describe('Config', function() {
    describe('create instance', function() {
        it('should success with no arguments', function() {
            const s = new Config();
            expect(s).to.be.an('object');
            // console.log(s.storagePath);
        });
    });
    describe('read configs.json', function() {
        const TMPPATH = './test-configs.json';
        before(function() {
            const configs = {
                storagePath: './somewere/storage',
            };
            fs.writeFileSync(TMPPATH, JSON.stringify(configs, null));
        });
        after(function() {
            fs.unlinkSync(TMPPATH);
        });
        it('should read json\'s key name', function() {
            const s = new Config(TMPPATH);
            expect(s.storagePath).to.equal('./somewere/storage');
        });
    });
});
