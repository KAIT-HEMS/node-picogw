'use strict';


module.exports = class {
    /**
     * Constructor of this class
     * @param {object} globals : global parameters
     * @param {object} parent : the instance of PluginInterface
     * @param {string} pluginName : name of plugin
     */
    constructor(globals, parent, pluginName) {
        const log = parent.log; // eslint-disable-line no-unused-vars
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

        initCallbacks();

        // eslint-disable-next-line require-jsdoc
        function saveAllMACs() {
            localStorage.setItem('MACtoIP', MACtoIP);
        };
        // eslint-disable-next-line require-jsdoc
        function setIPAddressAsInactive(ip) {
            if (ip == null) return;
            for (const mac in MACtoIP) {
                if (MACtoIP[mac] === ip) {
                    MACtoIP[mac] = IP_INACTIVE;
                }
            }
        };


        /**
         * Initialization after admin is available (can be called from any menber functions)
         * @return {boolean} Returns whether it succeeded or not
         */
        function initCallbacks() {
            if (callbacks == null) {
                callbacks = {
                    onMacFoundCallback: function() {},
                    onMacLostCallback: function() {},
                    onIPChangedCallback: function() {},
                };
                if (!globals.admin) {
                    return false;
                }
                globals.admin.setNetCallbacks_Forward(pluginName, {
                    onMacFoundCallback: function(net, newmac, newip) {
                        // log(`onMacFound(${net},${newmac},${newip})`);
                        // Do not register new macs here.
                        if (myNetworkInterface) {
                            if (net !== myNetworkInterface
                                || MACtoIP[newmac] === IP_UNREGISTERED) return;
                        }

                        setIPAddressAsInactive(newip);
                        MACtoIP[newmac] = newip;
                        saveAllMACs();
                        callbacks.onMacFoundCallback.call(
                            this, net, newmac, newip);
                    },
                    onMacLostCallback: function(net, lostmac, lostip) {
                        // log(`onMacLost(${net},${lostmac},${lostip})`);
                        if (myNetworkInterface) {
                            if (net !== myNetworkInterface) return;
                        }

                        setIPAddressAsInactive(lostip);
                        MACtoIP[lostmac] = IP_INACTIVE;
                        saveAllMACs();

                        callbacks.onMacLostCallback.call(
                            this, net, lostmac, lostip);
                    },
                    onIPChangedCallback: function(net, mac, oldip, newip) {
                        // log(`onIPChanged(${net},${mac},${oldip},${newip})`);

                        if (myNetworkInterface) {
                            if (net !== myNetworkInterface
                                || MACtoIP[mac] === IP_UNREGISTERED) return;
                        }

                        setIPAddressAsInactive(newip);
                        // assert(MACtoIP[mac] == oldip, 'onIPChangedCallback : old ip '+oldip+'does not exist');
                        MACtoIP[mac] = newip;
                        saveAllMACs();

                        callbacks.onIPChangedCallback.call(
                            this, net, mac, oldip, newip);
                    },
                });
            }
            return true;
        };

        // ////////////////////////////////////
        // / Definitions of public methods

        /**
         * Get network interfaces
         * @return {object} network list
         */
        this.getNetworkInterfaces = ()=>{
            const nets = globals.admin.getNetworkInterfaces();
            if (myNetworkInterface != null
                && nets[myNetworkInterface] != null) {
                nets[myNetworkInterface].active = true;
            }
            return nets;
        };

        /**
         * Set the network interface used in this class
         * @param {string} newNetworkInterface : the new interface name
         */
        this.setNetworkInterface = (newNetworkInterface) => {
            const nets = this.getNetworkInterfaces();
            if (myNetworkInterface != null
                && myNetworkInterface !== newNetworkInterface) {
                MACtoIP = {};
            }
            if (newNetworkInterface && nets[newNetworkInterface]) {
                myNetworkInterface = newNetworkInterface;
                myMAC = nets[newNetworkInterface].mac;
                MACtoIP[myMAC] = nets[newNetworkInterface].ip;
            } else {
                myNetworkInterface = null;
                myMAC = null;
            }

            localStorage.setItem('myNetworkInterface', newNetworkInterface);
            localStorage.setItem('myMAC', myMAC);
            saveAllMACs();
        };

        /**
         * Set callbacks
         *
         * Specify the callback parameters as follows
         *   onMacFoundCallback(net,newmac,newip)
         *   onMacLostCallback(net,lostmac,lostip)
         *   onIPChangedCallback(net,mac,oldip,newip)
         *
         * @param {Array.<function>} _callbacks : callbacks
         */
        this.setCallbacks = (_callbacks) => {
            callbacks.onMacFoundCallback
                = _callbacks.onMacFoundCallback || function() {};
            callbacks.onMacLostCallback
                = _callbacks.onMacLostCallback || function() {};
            callbacks.onIPChangedCallback
                = _callbacks.onIPChangedCallback || function() {};
        };

        /**
         * Register IP Address
         * @param {string} ip : ip address
         * @return {object} Return the detail information of ip
         */
        this.registerIP = async (ip) => {
            const net = globals.admin.searchNetworkInterface(ip);
            const mac = await globals.admin.getMACFromIPv4Address_Forward(
                net, ip, true);
            if (mac.error != null) {
                throw new Error(`MAC address could not be obtained for ${ip}`);
            }

            // Hope the IP has not been changed since the call of getMACFromIPv4Address()
            setIPAddressAsInactive(ip);
            // const oldip = MACtoIP[mac];
            MACtoIP[mac] = ip;
            saveAllMACs();

            return {
                net: net,
                mac: mac,
                get ip() {
                    return MACtoIP[mac];
                },
            };
        };

        /**
         * Get all devices
         * @return {Array.<object>} Return all device list
         */
        this.getAllDeviceObjects = async ()=> {
            const networks = globals.admin.getNetworkInterfaces();

            let ret = [];
            for (const _mac in MACtoIP) {
                if (!MACtoIP.hasOwnProperty(_mac)) continue;
                const mac = _mac;
                const net = globals.admin.searchNetworkInterface(
                    MACtoIP[mac], networks);
                let obj = {
                    net: net,
                    mac: mac,
                    get ip() {
                        return MACtoIP[mac];
                    },
                };
                if (mac == myMAC) {
                    obj.self = true;
                }
                ret.push(obj);
            }
            return ret;
        };

        /**
         * Set the route to static routing table
         * @param {string} target : the destination network or host. e.g. 224.0.23.0/32
         * @param {string} netInterface : network interface to set route
         * @param {string} rootPwd : root password for executing sudo
         * @return {Promise} Return last command output
         */
        this.routeSet = (target, netInterface, rootPwd) => {
            return globals.admin.routeSet(target, netInterface, rootPwd);
        };

        /**
         * Delete the route from static routing table
         * @param {string} target : the destination network or host. e.g. 224.0.23.0/32
         * @param {string} rootPwd : root password for executing sudo
         * @return {Promise} Return standard output of each command as an array
         */
        this.routeDelete = (target, rootPwd) => {
            return globals.admin.routeDelete(target, rootPwd);
        };

        /**
         * Check if NetworkManager is installed
         * @return {boolean} If true, it is installed
         */
        this.supportedNetworkManager = () => {
            return globals.admin.supportedNetworkManager();
        };
    }
};
