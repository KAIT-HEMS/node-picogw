module.exports = class {
    constructor(globals, pluginName) {
        this.globals = globals;
        this.pluginName = pluginName;
    }

    // TODO:replace to IpManager.js
	getMACFromIPv4Address (net,ip,bSearch) {
		if( this.pluginName === 'admin')
			return Promise.reject('Cannot call getMacFromIPv4Address from admin plugin') ;
		return this.globals.admin.getMACFromIPv4Address_Forward(net,ip,bSearch) ;
	}

	// callbacks_obj can contain the following four members
	// onMacFoundCallback	: function(net,newmac,newip) ;
	// onMacLostCallback	: function(net,lostmac,lostip) ;
	// onIPChangedCallback	: function(net,mac,oldip,newip) ;
	setNetCallbacks (callbacks_obj) {
		this.globals.admin.setNetCallbacks_Forward(this.pluginName , callbacks_obj) ;
	}

	// If the argument is true, returns only self macs.
	// Otherwise, returns all macs recognized
	getMACs (bSelfOnly) {
		return this.globals.admin.getMACs(bSelfOnly) ;
	}
}

