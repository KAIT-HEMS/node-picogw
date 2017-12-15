'use strict';

const readPackageTree = require('read-package-tree');
const fs = require('fs');
const path = require('path');
const npm = require('npm');
const util = require('util');

/**
 * List the plugins
 * @return {Array.<object>} List of plugin information
 */
async function list() {
    const legacyPluginPaths = await searchLegacyPlugins();
    const npmPluginPaths = await searchNpmPlugins();
    const pluginPaths = npmPluginPaths.concat(legacyPluginPaths);
    return pluginPaths;
}
module.exports.list = list;


/**
 * Delete this function as soon as the migration of the new plugin architecture is completed.
 * @return {Promise} Promise object that list plugins
 */
function searchLegacyPlugins() {
    return new Promise((ac, rj) => {
        // Scan plugins
        const rootpath = path.dirname(path.dirname(__filename));
        const PLUGINS_FOLDER = path.join(rootpath, 'v1/plugins/');
        try {
            fs.statSync(PLUGINS_FOLDER);
            fs.readdir(PLUGINS_FOLDER, (err, files) => {
                if (err) {
                    rj('No plugin folder found.'); return;
                }

                const packages = files.filter((dirname) => {
                    let fo = fs.lstatSync(PLUGINS_FOLDER + dirname);
                    return fo.isDirectory() || fo.isSymbolicLink();
                }).map((dirname) => {
                    const jspath = path.join(
                        PLUGINS_FOLDER, dirname, 'index.js');
                    return {
                        name: dirname,
                        requirePath: jspath,
                        role: ['server', 'client', 'http'],
                        legacy: true,
                    };
                });
                ac(packages);
            });
        } catch (e) {
            // console.log('No plugins exists.');
            ac([]);
        }
    });
}

/**
 * Search npm plugins
 * @return {Promise} Promise object that list plugins
 */
async function searchNpmPlugins() {
    const npmLoad = util.promisify(npm.load);
    await npmLoad({});
    const localNpms = await listNpms(path.resolve(npm.dir, '..'));
    npm.config.set('global', true);
    const globalNpms = await listNpms(path.resolve(npm.dir, '..'));

    let list = localNpms;
    for (const a of globalNpms) {
        if (list.find((b) => {
            return (a.name === b.name);
        })) {
            continue;
        }
        list.push(a);
    }
    return list;
}

/**
 * List npm packages
 * @param {string} dir Search directory
 * @return {Promise} Promise object that list plugins
 */
function listNpms(dir) {
    return new Promise((resolve, reject) => {
        readPackageTree(dir, (_, kidName) => {
            return kidName.startsWith('picogw');
        }, (_, tree) => {
            const findPlugin = (list, n) => {
                if (n.package.name) {
                    list.push(n);
                }
                for (const nc of n.children) {
                    findPlugin(list, nc);
                }
                return list;
            };
            const packages = findPlugin([], tree).filter((n) => {
                return (n.package.picogw && n.package.picogw.role &&
                        n.package.picogw.role.length > 0);
            }).map((n) => {
                return {
                    name: n.package.name.replace(/^picogw-plugin-/, ''),
                    requirePath: n.package.name,
                    version: n.package.version,
                    role: n.package.picogw.role,
                };
            });
            resolve(packages);
        });
    });
}
