'use strict';

// TODO:remove this eslint rule later.
/* eslint-disable require-jsdoc */

module.exports = class {
    constructor(globals, parent, pluginName) {
        const log = parent.log;
        if (pluginName === 'admin') {
            return;
        }
        const localStorage = parent.localStorage;
        let myNetworkInterface
            = localStorage.getItem('myNetworkInterface', null);
        let myMAC = localStorage.getItem('myMAC', null);
        let MACtoIP = localStorage.getItem('MACtoIP', {});

        let callbacks;
        const IP_INACTIVE = null;
        const IP_UNREGISTERED = undefined;

        this.IP_INACTIVE = IP_INACTIVE;
        this.IP_UNREGISTERED = IP_UNREGISTERED;

        function saveAllMACs() {
            localStorage.setItem('MACtoIP', MACtoIP);
        };
        function setIPAddressAsInactive(ip) {
            if (ip == null) return;
            for (const mac in MACtoIP) {
                if (MACtoIP[mac] === ip) {
                    MACtoIP[mac] = IP_INACTIVE;
                }
            }
        };


        // Initialization after admin is available (can be called from any menber functions)
        function init(funcname, bNoCheckInterface) {
            if (callbacks == null) {
                callbacks = {
                    onMacFoundCallback: function() {},
                    onMacLostCallback: function() {},
                    onIPChangedCallback: function() {},
                };
                globals.admin.setNetCallbacks_Forward(pluginName, {
                    onMacFoundCallback: function(net, newmac, newip) {
                        log(`onMacFound(${net},${newmac},${newip})`);
                        // Do not register new macs here.
                        if (net !== myNetworkInterface
                            || MACtoIP[newmac] === IP_UNREGISTERED) return;

                        setIPAddressAsInactive(newip);
                        MACtoIP[newmac] = newip;
                        saveAllMACs();
                        callbacks.onMacFoundCallback.call(
                            this, net, newmac, newip);
                    },
                    onMacLostCallback: function(net, lostmac, lostip) {
                        log(`onMacLost(${net},${lostmac},${lostip})`);
                        if (net !== myNetworkInterface) return;

                        setIPAddressAsInactive(lostip);
                        MACtoIP[lostmac] = IP_INACTIVE;
                        saveAllMACs();

                        callbacks.onMacLostCallback.call(
                            this, net, lostmac, lostip);
                    },
                    onIPChangedCallback: function(net, mac, oldip, newip) {
                        log(`onIPChanged(${net},${mac},${oldip},${newip})`);

                        if (net !== myNetworkInterface
                            || MACtoIP[mac] === IP_UNREGISTERED) return;

                        setIPAddressAsInactive(newip);
                        // assert(MACtoIP[mac] == oldip, 'onIPChangedCallback : old ip '+oldip+'does not exist');
                        MACtoIP[mac] = newip;
                        saveAllMACs();

                        callbacks.onIPChangedCallback.call(
                            this, net, mac, oldip, newip);
                    },
                });
            }

            const myMACs = globals.admin.getMACs(true);

            function selectFirstAvailableNetwork() {
                let n;
                let m;
                // let ip;
                for (const mymacCandidate in myMACs) {
                    if (!myMACs.hasOwnProperty(mymacCandidate)) {
                        continue;
                    }
                    n = myMACs[mymacCandidate].net;
                    m = mymacCandidate;
                    // ip = myMACs[mymacCandidate].ip;
                    break; // take the first available one.
                }
                if (n == null) { // No available network
                    log('Error: No network is assigned for '
                        +'pluginInterface.net.');
                    return false;
                }
                // const prevIP = (myMAC!=null && myMACs[myMAC] != null ? myMACs[myMAC].ip : null);
                myNetworkInterface = n;
                myMAC = m;
                MACtoIP[myMAC] = myMACs[myMAC].ip;

                localStorage.setItem('myNetworkInterface', myNetworkInterface);
                localStorage.setItem('myMAC', myMAC);
                saveAllMACs();

                log('The first available network '
                    +`${myNetworkInterface} (mac:${myMAC}) was selected.`);
            }
            if (bNoCheckInterface !== true && myNetworkInterface == null) { // The network is not set.
                if (selectFirstAvailableNetwork() === false) return false;
            }

            if (myNetworkInterface != null
                /* && myMAC != null*/ && myMACs[myMAC] == null) {
                log('Error: The selected network '
                    +`${myNetworkInterface} (mac:${myMAC}) does not exist `
                    +`any more.(PrevIP:${MACtoIP[myMAC]})`);
                if (selectFirstAvailableNetwork() === false) return false;
            }

            return true;
        };

        // ////////////////////////////////////
        // / Definitions of public methods

        this.getNetworkInterfaces = ()=>{
            let nets = {};
            const myMACs = globals.admin.getMACs(true);
            for (let mac in myMACs) {
                if (!myMACs.hasOwnProperty(mac)) continue;
                nets[myMACs[mac].net] = {mac: mac, ip: myMACs[mac].ip};
            }
            if (myNetworkInterface != null
                && nets[myNetworkInterface] != null) {
                nets[myNetworkInterface].active = true;
            }

            return nets;
        };

        this.setNetworkInterface = (newNetworkInterface) => {
            if (init('setNetworkInterface', true) == false) return;

            const nets = this.getNetworkInterfaces();
            if (nets[newNetworkInterface] == null) {
                log(`Error: network interface '${newNetworkInterface}' `
                    +'does not exist.');
                return;
            }

            if (myNetworkInterface != null
                && myNetworkInterface !== newNetworkInterface) {
                MACtoIP = {};
            }
            myNetworkInterface = newNetworkInterface;
            myMAC = nets[newNetworkInterface].mac;
            MACtoIP[myMAC] = nets[newNetworkInterface].ip;

            localStorage.setItem('myNetworkInterface', newNetworkInterface);
            localStorage.setItem('myMAC', myMAC);
            saveAllMACs();
        };

        //  onMacFoundCallback(net,newmac,newip)
        //  onMacLostCallback(net,lostmac,lostip)
        //  onIPChangedCallback(net,mac,oldip,newip)
        this.setCallbacks
            = (onMacFoundCallback, onMacLostCallback, onIPChangedCallback)=> {
                if (init('setCallbacks', true) == false) return;
                callbacks.onMacFoundCallback
                    = onMacFoundCallback || function() {};
                callbacks.onMacLostCallback
                    = onMacLostCallback || function() {};
                callbacks.onIPChangedCallback
                    = onIPChangedCallback || function() {};
            };

        this.registerIP = (ip) => {
            return new Promise((ac, rj)=>{
                if (init('registerIP') == false) {
                    rj({error: 'registerIP failed'});
                    return;
                }
                globals.admin.getMACFromIPv4Address_Forward(
                    myNetworkInterface, ip, true).then((mac)=>{
                    if (mac.error != null) {
                        rj({error:
                            `MAC address could not be obtained for ${ip}`});
                        return;
                    }
                    // Hope the IP has not been changed since the call of getMACFromIPv4Address()
                    setIPAddressAsInactive(ip);
                    // const oldip = MACtoIP[mac];
                    MACtoIP[mac] = ip;
                    saveAllMACs();

                    ac({
                        net: myNetworkInterface,
                        mac: mac,
                        get ip() {
                            return MACtoIP[mac];
                        },
                    });
                }).catch(rj);
            });
        };

        this.getAllDeviceObjects = ()=> {
            if (init('getAllDeviceObjects') == false) return;
            let ret = [];
            for (const _mac in MACtoIP) {
                if (!MACtoIP.hasOwnProperty(_mac)) continue;
                (()=>{
                    const mac = _mac;
                    let obj = {
                        net: myNetworkInterface,
                        mac: mac,
                        get ip() {
                            return MACtoIP[mac];
                        },
                    };
                    if (mac == myMAC) {
                        obj.self = true;
                    }
                    ret.push(obj);
                })();
            }
            return ret;
        };

        this.routeSet = (target, gatewayIp, rootPwd) => {
            return globals.admin.routeSet(target, gatewayIp, rootPwd);
        };

        this.supportedNetworkManager = () => {
            return globals.admin.supportedNetworkManager();
        }
    }
};
