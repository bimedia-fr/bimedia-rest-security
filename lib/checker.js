/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq: true,*/
"use strict";

var url = require('url');
var request = require('request');
var crypto = require('crypto');
var util = require("util");

module.exports = function(log, errors, options) {
	
	function getPublicKey(principal, cb) {
		request(util.format(options.keypath, principal), function (error, response, body) {
    		if (!error && response.statusCode == 200) {		
    			cb(error, body);
    			return;
    		}
    		cb(error || new Error('Invalid status code ' + response.statusCode));
		});
	}
	
	function verify(toSign, signature, publickey) {
		var hash = crypto.createVerify('RSA-SHA256');
		hash.update(toSign);
		return hash.verify(publickey, signature, 'base64');
	}
	
	function canonicalize(req) {
		var urlParts = url.parse(req.url, true);
		var params = urlParts.query || {};
		var queryString = Object.keys(params).sort().map(function(item, index, array) {
			return item+(params[item] ? '='+params[item] : '');
		}).join('&');
		var canonicalizedResource = urlParts.pathname + (queryString ? '?'+ queryString : '')
		
		var headers = req.headers || {};
		var canonicalizedHeaders = Object.keys(headers).filter(function(item) {
			return item.startsWith('x-bm-');
		}).sort().map(function(item, index, array) {
			return item+':'+headers[item];
		}).join("\n");			
		
		return [
              req.method,
              req.headers['content-md5'] || '',
              req.headers['content-type'] || '',
              req.headers['x-bm-date'] || req.headers['date'],
              canonicalizedHeaders,
              canonicalizedResource
              ].join("\n");
	}
	
	return function check(req, res, next) {
    	
		var principal = req.authorization.credentials.principal;
		
		getPublicKey(principal, function(error, publickey) {
			if(error) {
				// Invalid principal
        		log.info(req.authorization.credentials.principal, 'Public key not found', error.message);
        		next(new errors.NotAuthorizedError('invalid signature'));
        	    return;
			}
			
			var toSign = canonicalize(req);
			
			if(!verify(toSign, req.authorization.credentials.signature, publickey)) {
				// Invalid signature
				log.warn(req.authorization.credentials.principal, 'Invalid signature');
				next(new errors.NotAuthorizedError('invalid signature'));
				return;
			}
	    	next();
	    	
	    	
		});
    }
};