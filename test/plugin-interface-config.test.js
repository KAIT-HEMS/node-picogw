const expect = require('chai').expect;
const PluginInterfaceConfig = require('../lib/plugin-interface-config');


describe('PluginInterfaceConfig', function() {
    describe('config', function() {
        it('should read config', function() {
            const conf = {
                hello: 'world',
                a: 1,
            };
            conf.keys = () => Object.keys(conf);
            const c = new PluginInterfaceConfig(conf);
            expect(c.hello).to.equal('world');
            expect(c.a).to.equal(1);
        });
    });
});
