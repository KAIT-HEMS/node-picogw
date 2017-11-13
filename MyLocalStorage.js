"use strict";

const fs = require('fs');
const LocalStorage = require('node-localstorage').LocalStorage;
const INDEX_KEY_NAME = '__index__' ;

exports.QuotaLocalStorage = class {
	constructor(path,quota){
		this.path = path ;
		this.quota = (quota || 5000000) ; // 5MB default
		this.ls = new LocalStorage(path,1000000000) ;	// 1GB Max
		if( this.ls.getItem(INDEX_KEY_NAME) == null ){
			this.ls.setItem(INDEX_KEY_NAME,JSON.stringify({
				keys : {}
				,order : []
				,total : 0
			})) ;
		}
		this.removeUntilQuota = (index,newlen)=>{
			while(this.quota < index.total+newlen){
				let del_key = index.order.shift() ;
				let size = index.keys[del_key] ;
				this.ls.removeItem(del_key) ;
				index.total -= size ;
				delete index.keys[del_key] ;
			}
		}

		let index = JSON.parse(this.ls.getItem(INDEX_KEY_NAME)) ;
		this.removeUntilQuota(index,0) ;
		this.ls.setItem(INDEX_KEY_NAME,JSON.stringify(index)) ;	// Update index
	}
	getKeys(){
		let index = JSON.parse(this.ls.getItem(INDEX_KEY_NAME)) ;
		return index.keys ;
	}
	get length(){
		let index = JSON.parse(this.ls.getItem(INDEX_KEY_NAME)) ;
		return index.order.length ;
	}
	key(num){
		let index = JSON.parse(this.ls.getItem(INDEX_KEY_NAME)) ;
		return index.order[num] ;
	}
	getSize(){
		let index = JSON.parse(this.ls.getItem(INDEX_KEY_NAME)) ;
		return index.total ;
	}
	setQuota(quota){
		let index = JSON.parse(this.ls.getItem(INDEX_KEY_NAME)) ;
		this.quota = quota ;
		this.removeUntilQuota(index,0) ;

		this.ls.setItem(INDEX_KEY_NAME,JSON.stringify(index)) ;	// Update index
	}
	// Delete from older elements
	setItem(key,value){
		let index = JSON.parse(this.ls.getItem(INDEX_KEY_NAME)) ;
		let value_str = JSON.stringify(value) ;
		let size = value_str.length ;
		if( size > this.quota )
			throw({error:'The item size is already larger than quota'}) ;

		if( index.keys[key] != undefined ){
			let oldsize = index.keys[key] ;
			index.order.splice(index.order.indexOf(key),1) ;
			index.total -= oldsize ;
			delete index.keys[key] ;
		}

		this.removeUntilQuota(index,size) ;
		index.keys[key] = size ;
		index.total += size ;
		index.order.push(key) ;
		this.ls.setItem(key,value_str) ;	// Add new entry

		this.ls.setItem(INDEX_KEY_NAME,JSON.stringify(index)) ;	// Update index
	}

	getItem(key,defaultValue){
		let value = this.ls.getItem(key) ;
		return value==null ? defaultValue : JSON.parse(value) ;
	}

	removeItem(key){
		let index = JSON.parse(this.ls.getItem(INDEX_KEY_NAME)) ;
		if( index.keys[key] == null ) return ;
		this.ls.removeItem(key) ;
		let size = index.keys[key] ;
		index.order.splice(index.order.indexOf(key),1) ;
		index.total -= size ;
		delete index.keys[key] ;

		this.ls.setItem(INDEX_KEY_NAME,JSON.stringify(index)) ;	// Update index
	}

	clear(){
		this.ls.clear() ;
		this.ls.setItem(INDEX_KEY_NAME,JSON.stringify({
			keys : {}
			,order : []
			,total : 0
		})) ;
	}
}

exports.SingleFileLocalStorage = class {
	constructor (MYPATH){
		this.MYPATH = MYPATH ;
	}
	clear(){ fs.writeFileSync(this.MYPATH,'{}') ;}
	setItem(keyName,keyValue){
		let st = {} ;
		try {
			st = JSON.parse(fs.readFileSync(this.MYPATH).toString()) ;
		} catch(e){}
		st[keyName] = keyValue ;
		fs.writeFileSync(this.MYPATH,JSON.stringify(st,null,"\t")) ;
	}
	getItem(keyName , defaultValue){
		let st = {} ;
		try {
			st = JSON.parse(fs.readFileSync(this.MYPATH).toString()) ;
		} catch(e){}
		return st[keyName] == undefined ? defaultValue : st[keyName] ;
	}
	removeItem(keyName){
		let st = {} ;
		try {
			st = JSON.parse(fs.readFileSync(this.MYPATH).toString()) ;
		} catch(e){}
		delete st[keyName] ;
		fs.writeFileSync(this.MYPATH,JSON.stringify(st,null,"\t")) ;
	}
	content(){
		let st = {} ;
		try {
			st = JSON.parse(fs.readFileSync(this.MYPATH).toString()) ;
			return st ;
		} catch(e){}
		return null ;
	}
}