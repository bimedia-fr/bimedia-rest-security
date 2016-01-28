/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq:true*/
"use strict";

var crypto = require('crypto');
var url = require('url');

// Main module

function Signer() {
	this.opts = {};
}

Signer.prototype.sign = function(opts, principal, privatekey) {
	
	
	this.opts = {
		principal: principal,
		url: opts.url || '',
		method: opts.method || 'GET',
		headers: opts.headers || {},
		post: null
	};
	if(this.opts.method !== 'GET') {
		this.opts.post = {
				data: opts.post.data || '',
				json: opts.post.json || false
		};
	}
	
	var urlParts = url.parse(this.opts.url, true);
	var params = urlParts.query || {};
	var queryString = Object.keys(params).sort().map(function(item, index, array) {
		return item+(params[item] ? '='+params[item] : '');
	}).join('&');
	var canonicalizedResource = urlParts.pathname + (queryString ? '?'+queryString : '');
	
	if(!this.opts.headers['x-bm-date'] && !this.opts.headers['date']) {
		this.opts.headers['date'] = new Date().toUTCString();
	}
	if(this.opts.method !== 'GET') {
		if(this.opts.post.json) {
			this.opts.headers['content-md5'] = crypto.createHash('md5').update(JSON.stringify(this.opts.post.data)).digest("base64")
		} else {
			this.opts.headers['content-md5'] = crypto.createHash('md5').update(this.opts.post.data).digest("base64")
		}
	}
	var self = this;
	var canonicalizedHeaders = Object.keys(this.opts.headers).filter(function(item) {
		return item.startsWith('x-bm-');
	}).sort().map(function(item, index, array) {
		return item+':'+self.opts.headers[item];
	}).join("\n");
	
	var hash = crypto.createSign('RSA-SHA256');
	this.opts.headers.authorization = "BWS "+this.opts.principal+":"+hash.update(
			this.opts.method+"\n"+(this.opts.headers['content-md5'] || '')+"\n"+(this.opts.headers['content-type'] || '')+"\n"+(this.opts.headers['x-bm-date'] 
			|| this.opts.headers['date'])+"\n"+canonicalizedHeaders+"\n"+canonicalizedResource
	).sign(privatekey, 'base64');	
	
	return this;
};

Signer.prototype.toRequestParams = function() {
	var opts = {};
	// Request
	opts.url= this.opts.url;
	opts.method = this.opts.method;
	opts.headers = this.opts.headers;
	
	if(this.opts.post && this.opts.post.data) {
		opts.body = this.opts.post.data;
	}
	if(this.opts.post && this.opts.post.json) {
		opts.json = this.opts.post.json;
	}
	
	// http.request
	var parts = url.parse(this.opts.url);
	opts.protocol = parts.protocol;
	opts.hostname = parts.hostname;
	opts.port = parts.port;
	opts.path = parts.path;
	
	return opts;
}

Signer.prototype.postData = function() {
	return this.opts.post.data || null;
}

module.exports = new Signer();