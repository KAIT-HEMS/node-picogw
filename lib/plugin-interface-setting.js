const path = require('path');

module.exports = class {
    constructor(globals, pluginName, pluginPath, storePath) {
        this.globals = globals;
        this.pluginName = pluginName;
        this.pluginPath = pluginPath;
        this.storePath = storePath;
    }

	_getSettingsSchema() {
        let schema;
        try {
   		    schema = JSON.parse(fs.readFileSync(path.join(this.pluginPath), 'settings_schema.json').toString());
   	    } catch(e) {
        }
        schema = this.onUIGetSettingsSchema(schema);
        return schema;
    };

    onUIGetSettingsSchema(schema) {
        return schema;
    }

    getSettings() {
        try {
   			return JSON.parse(fs.readFileSync(path.join(this.storePath), 'settings.json').toString());
   		} catch(e) {
        }
        return undefined;
    }

    onUIGetSettings(settings) {
        return settings;
    }

    onUISetSettings(settings) {
        return settings;
    }
}
