const fs = require('fs');
const expect = require('chai').expect;
const Setting = require('../lib/setting');

describe('Setting', function() {
    describe('create instance', function() {
        it('should success with no arguments', function() {
            const s = new Setting();
            expect(s).to.be.an('object');
            // console.log(s.storagePath);
        });
    });
    describe('read settings.json', function() {
        const TMPPATH = './test-settings.json';
        before(function() {
            const settings = {
                storagePath: './somewere/storage',
            };
            fs.writeFileSync(TMPPATH, JSON.stringify(settings, null));
        });
        after(function() {
            fs.unlinkSync(TMPPATH);
        });
        it('should read json\'s key name', function() {
            const s = new Setting(TMPPATH);
            expect(s.storagePath).to.equal('./somewere/storage');
        });
    });
});
