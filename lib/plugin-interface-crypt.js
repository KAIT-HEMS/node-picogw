'use strict';
const fs = require('fs');
const cryptico = require('cryptico');
const log = console.log;
const RSA_BITS = 1024;

module.exports = class {
    constructor(globals) {
        this.globals = globals;
    }

    getPubKey() {
        return this.globals.getPubKey();
    }

    decrypt(srcStr, pubKey) {
        return this.globals.decrypt(srcStr, pubKey);
    }

    encrypt(srcStr, rsaKey) {
        return this.globals.encrypt(srcStr, rsaKey);
    }
}

module.exports.genCryptFunctions = function() {
    // TODO: change key store path
    const KEY_PATH = './clients/.key' ;
    let passPhrase;
    try {
        passPhrase = fs.readFileSync(KEY_PATH, 'utf8');
    } catch(err) {
        const randStrSrc='abcdefghijklmnopqrstuvxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        passPhrase = '' ;
        for (let i=0; i<100; ++i) {
            passPhrase += randStrSrc[parseInt(Math.random()*randStrSrc.length)];
        }
        fs.writeFileSync(KEY_PATH, passPhrase);
    }

    log('Generating RSA key..') ;
    let rsaKey = cryptico.generateRSAKey(passPhrase, RSA_BITS) ;
    let pubKey = cryptico.publicKeyString(rsaKey) ;

    log('RSA key generated.') ;

    const ret = {};
    ret.getPubKey = ()=>pubKey ;
    ret.encrypt = srcStr => cryptico.encrypt( srcStr, pubKey ).cipher;
    ret.decrypt = srcStr => cryptico.decrypt( srcStr, rsaKey ).plaintext;
    return ret;
}
