const readPackageTree = require('read-package-tree');
const fs = require('fs');
const path = require('path');
const npm = require('npm');
const util = require('util');

module.exports.list = list;
async function list() {
    const legacyPluginPaths = await searchLegacyPlugins();
    const npmPluginPaths = await searchNpmPlugins();
    const pluginPaths = Object.assign(npmPluginPaths, legacyPluginPaths);
    return pluginPaths;
}


/**
 * Delete this function as soon as the migration of the new plugin architecture is completed.
 */
function searchLegacyPlugins() {
    return new Promise((ac,rj) => {
        // Scan plugins
        const rootpath = path.dirname(path.dirname(__filename));
        const PLUGINS_FOLDER = path.join(rootpath, 'v1/plugins/') ;
        try {
            fs.statSync( PLUGINS_FOLDER ) ;
            fs.readdir( PLUGINS_FOLDER, (err, files) => {
                if (err){ rj('No plugin folder found.'); return; }

                var packages = {} ;
                files.filter(dirname => {
                    var fo = fs.lstatSync(PLUGINS_FOLDER + dirname) ;
                    return fo.isDirectory() || fo.isSymbolicLink();
                }).forEach(dirname => {
                    packages[dirname] = {
                        requirePath: path.join(PLUGINS_FOLDER, dirname, 'index.js'),
                        role: ['api', 'ui', 'client'],
                    }
                }) ;
                ac(packages);
            }) ;
        } catch(e) {
            rj('No plugins exists.') ;
        }
    });
}

async function searchNpmPlugins() {
    const npmLoad = util.promisify(npm.load);
    await npmLoad({});
    const localNpms = await listNpms(path.resolve(npm.dir, '..'))
    npm.config.set('global', true);
    const globalNpms = await listNpms(path.resolve(npm.dir, '..'));
    return Object.assign(localNpms, globalNpms);
}

function listNpms(dir) {
    return new Promise((resolve, reject) => {
        readPackageTree(dir, (_, kidName) => {
            return kidName.startsWith('picogw-plugin-');
        }, (_, tree) => {
            const packages = {};
            tree.children.forEach((n) => {
                packages[n.package.name] = {
                    requirePath: n.package.name,
                    version: n.package.version,
                    role: n.package.picogw.role,
                };
            });
            resolve(packages);
        });
    });
}
