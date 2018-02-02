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
     * @param {string} pluginPath Module load path
     * @param {string} settingFile Setting file
     */
    constructor(pluginPath, settingFile) {
        this._pluginPath = pluginPath;
        this._settingFile = settingFile;
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
            return JSON.parse(fs.readFileSync(this._settingFile).toString());
        } catch (e) {
        }
        try {
            const defaultFile = path.join(
                this._pluginPath, 'settings_default.json');
            return JSON.parse(fs.readFileSync(defaultFile).toString());
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
     * Obtaining the settings
     * @return {object} settings
     */
    async _getUISettings() {
        const uiGetSettings = async (_settings) => {
            return this.onUIGetSettings(_settings);
        };
        let settings = this.getSettings();
        settings = await uiGetSettings(settings).catch((e) => {
            log(e);
            return undefined;
        });
        return settings;
    };

    /**
     * Obtaining the settings schema
     * @return {object} settings schema
     */
    async _getUISettingsSchema() {
        let schema;
        const schemaFile = path.join(this._pluginPath, 'settings_schema.json');
        if (fs.existsSync(schemaFile)) {
            try {
                schema = JSON.parse(fs.readFileSync(schemaFile).toString());
            } catch (e) {
                log('Error: read schema file.', schemaFile);
                log(e);
            }
        }
        const settings = await this._getUISettings();
        const uiGetSettingsSchema = async (_schema, _settings) => {
            return this.onUIGetSettingsSchema(_schema, _settings);
        };
        return await uiGetSettingsSchema(schema, settings).catch((e) => {
            log(e);
            return undefined;
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
            if (settings==null) {
                ac();
                return; // If null is returned, the file is not created.
            }
            const json = JSON.stringify(settings, null, '\t');
            fs.writeFile(this._settingFile, json, (err) => {
                if (err) {
                    rj({error: err});
                } else {
                    ac();
                }
            });
        });
    }
};
