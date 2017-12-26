'use strict';

// TODO:remove this eslint rule later.
/* eslint-disable require-jsdoc */

const fs = require('fs');
const path = require('path');
const log = console.log;

module.exports = class {
    constructor(globals, pluginName, pluginPath, storePath) {
        this.globals = globals;
        this.pluginName = pluginName;
        this.pluginPath = pluginPath;
        this.storePath = storePath;
        this.settingFile = path.join(
            this.storePath, `${pluginName}-settings.json`);
    }

    _getSettingsSchema() {
        let schema;
        const schemaFile = path.join(this.pluginPath, 'settings_schema.json');
        if (fs.existsSync(schemaFile)) {
            try {
                schema = JSON.parse(fs.readFileSync(schemaFile).toString());
            } catch (e) {
                log('Error: read schema file.', schemaFile);
                log(e);
            }
        }
        schema = this.onUIGetSettingsSchema(schema);
        return schema;
    };


    onUIGetSettingsSchema(schema) {
        return schema;
    }

    getSettings() {
        try {
            return JSON.parse(fs.readFileSync(this.settingFile).toString());
        } catch (e) {
        }
        return undefined;
    }

    onUIGetSettings(settings) {
        return settings;
    }

    onUISetSettings(settings) {
        return settings;
    }

    _setSettings(settings) {
        return new Promise((ac, rj) => {
	    Promise.all([this.onUISetSettings(settings)]).then((re)=>{
                settings = re[0];// Overwrite ok?
                if (settings==null) {
                    ac();
                    return; // If null is returned, the file is not created.
                }
                const json = JSON.stringify(settings, null, '\t');
                fs.writeFile(this.settingFile, json, (err) => {
                    if (err) {
                        rj({error: err});
                    } else {
                        ac();
                    }
                });
	    }).catch(rj);
        });
    }
};
