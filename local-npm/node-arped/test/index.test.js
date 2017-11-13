/*eslint-env mocha */
/*eslint-disable no-unused-expressions*/
'use strict';

import chai, {expect} from 'chai';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

describe('Arped', () => {
    let Arped,
        genericARPSpy,
        linuxARPSpy,
        macOSARPSpy,
        windowsARPSpy,
        sandbox;

    before(() => {
       sandbox = sinon.sandbox.create();
    });

    beforeEach(() => {
        genericARPSpy = sandbox.spy();
        linuxARPSpy = sandbox.spy();
        macOSARPSpy = sandbox.spy();
        windowsARPSpy = sandbox.spy();

        Arped = proxyquire('../src', {
            './fetchers/GenericARP': { default: genericARPSpy },
            './fetchers/LinuxARP': { default: linuxARPSpy },
            './fetchers/MacOSARP': { default: macOSARPSpy },
            './fetchers/WindowsARP': { default: windowsARPSpy }
        }).default;
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('constructor()', () => {
        it('should utilise the Linux ARP fetcher on Linux systems', () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux'
            });

            new Arped();

            return expect(linuxARPSpy).to.have.been.called;
        });

        it('should utilise the macOS ARP fetcher on macOS systems', () => {
            Object.defineProperty(process, 'platform', {
                value: 'darwin'
            });

            new Arped();

            return expect(macOSARPSpy).to.have.been.called;
        });

        it('should utilise the Windows ARP fetcher on Windows systems', () => {
            Object.defineProperty(process, 'platform', {
                value: 'win32'
            });

            new Arped();

            return expect(windowsARPSpy).to.have.been.called;
        });

        it('should utilise the Generic ARP fetcher on generic systems', () => {
            Object.defineProperty(process, 'platform', {
                value: 'generic'
            });

            new Arped();

            return expect(genericARPSpy).to.have.been.called;
        });
    });
});
