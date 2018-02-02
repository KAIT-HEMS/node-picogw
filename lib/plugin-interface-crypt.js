'use strict';
const fs = require('fs');
const path = require('path');
const cryptico = require('cryptico');
const log = console.log;
const RSA_BITS = 1024;

/**
 * Interface of encryption library
 */
module.exports = class {
    /**
     * constructor of this class
     * @param {object} globals Parameters of various objects
     */
    constructor(globals) {
        this._globals = globals;
    }

    /**
     * Get the public key
     * @return {string} Return public key
     */
    getPubKey() {
        return this._globals.getPubKey();
    }

    /**
     * Decrypt string
     * @param {string} srcStr Encrypted string
     * @param {object} pubKey Public key string. If you do not specify anything, use the default Public key.
     * @return {string} Decrypted string
     */
    decrypt(srcStr, pubKey) {
        return this._globals.decrypt(srcStr, pubKey);
    }

    /**
     * Encrypt string
     * @param {string} srcStr String to encrypt
     * @param {object} rsaKey RSA key object. If you do not specify anything, use the default RAS key.
     * @return {string} Encrypted string
     */
    encrypt(srcStr, rsaKey) {
        return this._globals.encrypt(srcStr, rsaKey);
    }
};

module.exports.genCryptFunctions = function(storagePath) {
    const KEY_PATH = path.join(storagePath, '.key');
    let passPhrase;
    try {
        passPhrase = fs.readFileSync(KEY_PATH, 'utf8');
    } catch (err) {
        const randStrSrc =
              'abcdefghijklmnopqrstuvxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        passPhrase = '';
        for (let i=0; i<100; ++i) {
            passPhrase += randStrSrc[parseInt(Math.random()*randStrSrc.length)];
        }
        fs.writeFileSync(KEY_PATH, passPhrase);
    }

    log('Generating RSA key..');
    let rsaKey = cryptico.generateRSAKey(passPhrase, RSA_BITS);
    let pubKey = cryptico.publicKeyString(rsaKey);

    log('RSA key generated.');

    const ret = {};
    ret.getPubKey = ()=>pubKey;
    ret.encrypt = (srcStr) => cryptico.encrypt(srcStr, pubKey).cipher;
    ret.decrypt = (srcStr) => cryptico.decrypt(srcStr, rsaKey).plaintext;
    return ret;
};
