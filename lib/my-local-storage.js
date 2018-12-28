'use strict';

const fs = require('fs');
const LocalStorage = require('node-localstorage').LocalStorage;
const INDEX_KEY_NAME = '__index__';

exports.QuotaLocalStorage = class {
    /**
     * constructor of this class
     * @param {string} path Store path
     * @param {number} [quota=5000000] The size of qvuota
     */
    constructor(path, quota) {
        this.path = path;
        this.quota = (quota || 5000000); // 5MB default
        this.ls = new LocalStorage(path, 1000000000); // 1GB Max
        if (this.ls.getItem(INDEX_KEY_NAME) == null) {
            this.ls.setItem(INDEX_KEY_NAME, JSON.stringify({
                keys: {},
                order: [],
                total: 0,
            }));
        }
        this.removeUntilQuota = (index, newlen)=>{
            while (this.quota < index.total+newlen) {
                let delKey = index.order.shift();
                let size = index.keys[delKey];
                this.ls.removeItem(delKey);
                index.total -= size;
                delete index.keys[delKey];
            }
        };

        let index = JSON.parse(this.ls.getItem(INDEX_KEY_NAME));
        this.removeUntilQuota(index, 0);
        this.ls.setItem(INDEX_KEY_NAME, JSON.stringify(index)); // Update index
    }

    /**
     * Returns all keys
     * @return {Array.<string>} Returns all keys
     */
    getKeys() {
        let index = JSON.parse(this.ls.getItem(INDEX_KEY_NAME));
        return index.keys;
    }

    /**
     * Returns an integer representing the number of data items stored in the Storage object.
     * @return {number} An integer
     */
    get length() {
        let index = JSON.parse(this.ls.getItem(INDEX_KEY_NAME));
        return index.order.length;
    }

    /**
     * The key() method of the Storage interface, when passed a number n,
     * returns the name of the nth key in the storage.
     * The order of keys is user-agent defined, so you should not rely on it.
     * @param {number} num An integer representing the number of the key you want to get the name of.
     *              This is a zero-based index.
     * @return {object} An Object containing the name of the key.
     */
    key(num) {
        let index = JSON.parse(this.ls.getItem(INDEX_KEY_NAME));
        return index.order[num];
    }

    /**
     * Set quota size
     * @param {number} quota Size of quota
     */
    setQuota(quota) {
        let index = JSON.parse(this.ls.getItem(INDEX_KEY_NAME));
        this.quota = quota;
        this.removeUntilQuota(index, 0);

        this.ls.setItem(INDEX_KEY_NAME, JSON.stringify(index)); // Update index
    }

    /**
     * When passed a key name and value, will add that key to the storage,
     * or update that key's value if it already exists
     * This function delete from older elements.
     * @param {string} key A string containing the name of the key you want to create/update.
     * @param {object} value A object containing the value you want to give the key you are creating/updating.
     */
    setItem(key, value) {
        const index = JSON.parse(this.ls.getItem(INDEX_KEY_NAME));
        const valueStr = JSON.stringify(value);
        if (typeof value === 'undefined' || value === null) {
            this.removeItem(key);
            return;
        }
        const size = valueStr.length;
        if (size > this.quota) {
            const msg = 'The item size is already larger than quota';
            throw new Error({error: msg});
        }

        if (index.keys[key] != undefined) {
            let oldsize = index.keys[key];
            index.order.splice(index.order.indexOf(key), 1);
            index.total -= oldsize;
            delete index.keys[key];
        }

        this.removeUntilQuota(index, size);
        index.keys[key] = size;
        index.total += size;
        index.order.push(key);
        this.ls.setItem(key, valueStr); // Add new entry

        this.ls.setItem(INDEX_KEY_NAME, JSON.stringify(index)); // Update index
    }

    /**
     * When passed a key name, will return that key's value
     * @param {string} key A string containing the name of the key you want to retrieve the value of.
     * @param {object} [defaultValue=undefined] Return this value, when key not exist.
     * @return {object} A object containing the value of the key. If the key does not exist, null is returned.
     */
    getItem(key, defaultValue) {
        let value = this.ls.getItem(key);
        return value==null ? defaultValue : JSON.parse(value);
    }

    /**
     * When passed a key name, will remove that key from the storage.
     * @param {string} key A string containing the name of the key you want to remove.
     */
    removeItem(key) {
        let index = JSON.parse(this.ls.getItem(INDEX_KEY_NAME));
        if (index.keys[key] == null) return;
        this.ls.removeItem(key);
        let size = index.keys[key];
        index.order.splice(index.order.indexOf(key), 1);
        index.total -= size;
        delete index.keys[key];

        this.ls.setItem(INDEX_KEY_NAME, JSON.stringify(index)); // Update index
    }

    /**
     * When invoked, will empty all keys out of the storage.
     */
    clear() {
        this.ls.clear();
        this.ls.setItem(INDEX_KEY_NAME, JSON.stringify({
            keys: {},
            order: [],
            total: 0,
        }));
    }
};

exports.SingleFileLocalStorage = class {
    /**
     * constructor of this class
     * @param {string} MYPATH Store path
     * @param {number} [quota=5000000] The size of qvuota
     */
    constructor(MYPATH) {
        this.MYPATH = MYPATH;
    }

    /**
     * When invoked, will empty all keys out of the storage.
     */
    clear() {
        fs.writeFileSync(this.MYPATH, '{}');
    }

    /**
     * When passed a key name and value, will add that key to the storage,
     * or update that key's value if it already exists
     * @param {string} keyName A string containing the name of the key you want to create/update.
     * @param {object} keyValue A object containing the value you want to give the key you are creating/updating.
     */
    setItem(keyName, keyValue) {
        let st = {};
        try {
            st = JSON.parse(fs.readFileSync(this.MYPATH).toString());
        } catch (e) {}
        st[keyName] = keyValue;
        fs.writeFileSync(this.MYPATH, JSON.stringify(st, null, '\t'));
    }

    /**
     * When passed a key name, will return that key's value
     * @param {string} keyName A string containing the name of the key you want to retrieve the value of.
     * @param {object} [defaultValue=undefined] Return this value, when key not exist.
     * @return {object} A object containing the value of the key. If the key does not exist, null is returned.
     */
    getItem(keyName, defaultValue) {
        let st = {};
        try {
            st = JSON.parse(fs.readFileSync(this.MYPATH).toString());
        } catch (e) {}
        return st[keyName] == undefined ? defaultValue : st[keyName];
    }

    /**
     * When passed a key name, will remove that key from the storage.
     * @param {string} keyName A string containing the name of the key you want to remove.
     */
    removeItem(keyName) {
        let st = {};
        try {
            st = JSON.parse(fs.readFileSync(this.MYPATH).toString());
        } catch (e) {}
        delete st[keyName];
        fs.writeFileSync(this.MYPATH, JSON.stringify(st, null, '\t'));
    }

    /**
     * Return all contents in this storage.
     * @return {object} all contents in this storage
     */
    content() {
        let st = {};
        try {
            st = JSON.parse(fs.readFileSync(this.MYPATH).toString());
            return st;
        } catch (e) {}
        return null;
    }
};
