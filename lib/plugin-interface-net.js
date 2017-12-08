'use strict';

// TODO:remove this eslint rule later.
/* eslint-disable require-jsdoc */

module.exports = class {
    constructor(globals, pluginName) {
        this.globals = globals;
        this.pluginName = pluginName;
    }

    // TODO:replace to IpManager.js
    getMACFromIPv4Address(net, ip, bSearch) {
        if (this.pluginName === 'admin') {
            return Promise.reject(
                'Cannot call getMacFromIPv4Address from admin plugin');
        }
        return this.globals.admin.getMACFromIPv4Address_Forward(
            net, ip, bSearch);
    }

    /**
     * Set the network callback function
     * @param {Array.<function>} callbacksObj can contain the following three members
     *   onMacFoundCallback   : function(net,newmac,newip)
     *   onMacLostCallback    : function(net,lostmac,lostip)
     *   onIPChangedCallback  : function(net,mac,oldip,newip)
     */
    setNetCallbacks(callbacksObj) {
        this.globals.admin.setNetCallbacks_Forward(
            this.pluginName, callbacksObj);
    }

    // If the argument is true, returns only self macs.
    // Otherwise, returns all macs recognized
    getMACs(bSelfOnly) {
        return this.globals.admin.getMACs(bSelfOnly);
    }
};
