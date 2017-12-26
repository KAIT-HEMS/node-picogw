'use strict';

const fs = require('fs');
const path = require('path');
const log = console.log;

/**
 * Interface of settings
 */
module.exports = class {
    /**
     * constructor of this class
     * @param {object} globals Parameters of various objects
     * @param {string} pluginName The name of plugin
     * @param {string} pluginPath Module load path
     * @param {string} settingFile Setting file
     */
    constructor(globals, pluginName, pluginPath, settingFile) {
        this.globals = globals;
        this.pluginName = pluginName;
        this.pluginPath = pluginPath;
        this.settingFile = settingFile;
    }


    /**
     * Retrieve UI setting schema
     * @param {object} schema UI setting schema
     * @return {object} UI setting schema
     */
    onUIGetSettingsSchema(schema) {
        return schema;
    }

    /**
     * Get settings
     * @return {object} settings
     */
    getSettings() {
        try {
            return JSON.parse(fs.readFileSync(this.settingFile).toString());
        } catch (e) {
        }
        return undefined;
    }

    /**
     * Acquire setting value for UI
     * @param {object} settings Setting values of each plugin
     * @return {object} Setting values for UI settins
     */
    onUIGetSettings(settings) {
        return settings;
    }

    /**
     * Setting value rewriting event for UI
     * @param {object} settings Settings edited for UI
     * @return {object} Settings to save
     */
    onUISetSettings(settings) {
        return settings;
    }


    /**
     * Obtaining the settings schema
     * @return {object} settings schema
     */
    async _getSettingsSchema() {
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
        const uiGetSettings = async (_settings) => {
            return this.onUIGetSettings(_settings);
        };
        let settings = this.getSettings();
        settings = await uiGetSettings(settings);


        const uiGetSettingsSchema = async (_schema, _settings) => {
            return this.onUIGetSettingsSchema(schema, settings);
        };
        return uiGetSettingsSchema(schema, settings).catch((e) => {
            console.log(e);
        });
    };


    /**
     * Store the settings
     * @param {object} settings Settings to save
     * @return {Promise} store settings procedure
     */
    async _setSettings(settings) {
        const uiSetSettings = async (_settings) => {
            return this.onUISetSettings(_settings);
        };
        settings = await uiSetSettings(settings);
        return new Promise((ac, rj) => {
            const json = JSON.stringify(settings, null, '\t');
            fs.writeFile(this.settingFile, json, (err) => {
                if (err) {
                    rj({error: err});
                } else {
                    ac();
                }
            });
        });
    }
};
