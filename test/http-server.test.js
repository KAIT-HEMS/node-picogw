const expect = require('chai').expect;
const httpServer = require('../lib/http-server');

describe('applyEndpoints', function() {
    describe('sortEndpoints', function() {
        it('should sort endpoints correctly', function() {
            const func1 = () => {};
            const func2 = () => {};
            const func3 = () => {};
            const func4 = () => {};
            httpServer.endpoint(0, 'get', 'v*/*', func1);
            httpServer.endpoint(0, 'get', '*', func2);
            httpServer.endpoint(1, 'get', 'auth.html', func3);
            httpServer.endpoint(1, 'get', '*', func4);
            const sorted = httpServer.sortEndpointsForTest();
            expect(sorted[0].callback).to.equal(func3);
            expect(sorted[1].callback).to.equal(func1);
            expect(sorted[2].callback).to.equal(func4);
            expect(sorted[3].callback).to.equal(func2);
        });
    });
});
