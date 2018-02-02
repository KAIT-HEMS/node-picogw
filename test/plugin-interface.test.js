const fs = require('fs-extra');
const expect = require('chai').expect;
const PluginInterface = require('../lib/plugin-interface').PluginInterface;

describe('PluginInterface', function() {
    const STORAGEPATH = './test-storage';
    before(function() {
        if (!fs.existsSync(STORAGEPATH)) {
            fs.mkdirsSync(STORAGEPATH);
        }
    });
    after(function() {
        if (fs.existsSync(STORAGEPATH)) {
            // fs.rmdirSync(STORAGEPATH);
            fs.removeSync(STORAGEPATH);
        }
    });
    describe('create instance', function() {
        it('should success', function() {
            new PluginInterface(
                {}, 'abc',
                ['server', 'client', 'http'], '.', STORAGEPATH);
        });
    });
    describe('server plugin', function() {
        it('should have server functions', function() {
            const pi = new PluginInterface(
                {}, 'abc', ['server'], '.', STORAGEPATH);
            expect(pi.server.publish).to.be.a('function');
        });
        it('should not have client function', function() {
            const pi = new PluginInterface(
                {}, 'abc', ['server'], '.', STORAGEPATH);
            expect(pi.client).to.be.undefined;
        });
    });
    describe('client plugin', function() {
        it('should have client functions', function() {
            const pi = new PluginInterface(
                {}, 'abc', ['client'], '.', STORAGEPATH);
            expect(pi.client.subscribe).to.be.a('function');
            expect(pi.client.unsubscribe).to.be.a('function');
            expect(pi.client.callProc).to.be.a('function');
        });
        it('should not have server function', function() {
            const pi = new PluginInterface(
                {}, 'abc', ['client'], '.', STORAGEPATH);
            expect(pi.server).to.be.undefined;
        });
    });
});
