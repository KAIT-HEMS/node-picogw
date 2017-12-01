module.exports = class {
    constructor(globals, pluginName) {
        this.globals = globals;
        this.pluginName = pluginName;
    }

    publish(topicname, args) {
        var path;
        if (topicname==null || topicname==='') {
            path = `/${this.pluginName}`;
        } else {
            if (topicname.slice(-1)==='/') {
                topicname = topicname.slice(0, -1);
            }
            path = `/${this.pluginName}/${topicname}`;
        }

        var re = {method:'PUB'};
        re[path] = args;
        this.globals.PubSub.pub(path, re /*{method:'PUB',path:path,args:args}*/);
    }

    onCall(method, path, args) {
        throw new Error(`The ${this.pluginName} plugin for role 'server' needs to implement onCall(method, path, args).`);
    }
}
