/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq: true,*/
"use strict";

var nodeunit = require('nodeunit');
var http = require('http');
var request = require('request');
var errors = require('restify-errors');
var Readable = require('stream').Readable;
var crypto = require('crypto');
var url = require('url');

var checker = require('../lib/checker');

module.exports = {
	
	setUp: function(callback) {	
		this.privatekey = '-----BEGIN RSA PRIVATE KEY-----\n'+
		'MIIEpAIBAAKCAQEApXKJfC0AYWk2Xwe6KbzOoijbHUNn//IUHsU8bxsoZ9L6szrz\n'+
		'pZ0P9GPc5v7R8za9afCxSRKWbFrXCgLko5M2t8ILggBnm7gdmB+Qt8EiHbIlRJsY\n'+
		'yX7Kdh27IZCTD4l5KglpZ5JOhWxOldB4WD2qUTrRgHYRgbJkfhdODPJ7jjYWjn8G\n'+
		'N4KpZ1cz/V1HjZT5HuqQ0BLSotslOAvWhqE2nWSfhg9Bf41sVTY0gw89QlUvJjOP\n'+
		'tebyuMk9SniMXLNSKb4T409nDBL2wYPFi8JGR4rtXT/Vcvx9Cvs9RB/RLTWpf7qH\n'+
		'F0tvZDUn3zPslAcAQnRmJCtgK3on2+ZUkkrErQIDAQABAoIBAQCjwD6FkgDbaQgw\n'+
		'fHRsVPxrkWZ1iz7HG3GAlxTenxGZ2T7a4FFArLia2bBNTQ6924MT9O9zdJs/eZV2\n'+
		'yjBEGjPBIqTDMeVaQZvA8hUJWnWK0MSEJ8IbxItc5sZNTUvQx+8NhS03Hp7q/ay2\n'+
		'KRTDuZz2MvIiZDmllcxS5HwS4nkZ4aVXI/MCQrqSE2X+6zIbXyH9LwbtbSL0eTd2\n'+
		'0aAtSjGFnZRThvP8efJDf0lPose33dzXnLCSOdOgjBqSGYKDFYmQrvQBHOCR+926\n'+
		'GphYttmYtVCzlZHt0SR0A4AJbWDPtPWAv3rqyFHy4iYeQ3gEdq/uqGTHctb1KJn3\n'+
		'IJA8ZbzdAoGBANPrEkBqinGfDfWL9qwp02TnPUkTXvdUNZwkon532EQs81CGzIK4\n'+
		'8DgmhM/Hp/2xaU4vg0s8BNzUJFP7YRMod0NqHHgmtJ15Nx4W4CuYvcj5yp/fydfO\n'+
		'vAM8lZgKHe5JfKyoTXxTroWjBFw2Z+NMESAqgiMeB0M9aleVX/eOrmaTAoGBAMfc\n'+
		'1PO3GyyTGuHaZZ7HEaW5PuA+/UlklNtsNwQl70EIox+f/L7JNhQkRISM4TbljR7i\n'+
		'g9vk2Q1c6Wm9hNU72/5OUBJVZGBF/vHz8m0bK4lWvPJIf+cbzcLbt5sARyg3WWkd\n'+
		'g8SqnilLiE4HF5sTKstnXx3oAoR3cVfI+sTCk++/AoGANpN9mdVWXjimMaygFGqZ\n'+
		'JI1g/Sbd+DhZriLJLmTS74vcBcsRdEEIrI1O+uviWbWM9zPJTmDgp7aCvJYqw/JR\n'+
		'9KypNFBTh5KmHTuq889cYRvjkRTjOI7nYLYDmKpSVwHZ9+VIP1KVyZjYEJ96VdFL\n'+
		'P8tyxHSBTlHMx02S74Bxbb0CgYBqXIZjsPVgMmUi/rQH3I7yr/PbKQpoTYO+hgd9\n'+
		'SKbb6DnPcbfy3GfQLkDcfZC5Q05nukpL8qzkJKb/I+GWDQYVfx2ztAf4CCgWISnJ\n'+
		'kKUJsMRa9+RBXJWS9pTugyZbK6GEhDWEqvwCo/TE+ZdBauDiYH/JDZiRYHNMMWPq\n'+
		'5FYQRwKBgQCU6ONg4Mo3//N92t8tL665s8t3CZT4cw5zfEUFOpCGG01+rtObu30j\n'+
		'KfNrrBuo9J5p3zcHvLc4p6hJwZzppPhFNvVdxjLBJ6P00WV7mGsQH/Q7MqIA2FO8\n'+
		'+Lm3roJEavQDW/zWRk/hYdRtSqQXqH8FemtPytreW50hc6PNiZ2DUQ==\n'+
		'-----END RSA PRIVATE KEY-----\n';
		
		this.log = function() {};
		this.log.prototype.info = this.log.prototype.warn = function() {};
		
		this.basicRequest = new Readable;
		this.basicRequest.push(null);
		this.basicRequest.headers = {
			'x-bm-date': new Date().toUTCString()
		};
		this.basicRequest.authorization = {
			scheme : 'BWS',
            credentials: {
            	principal : 'KNOWN_PRINCIPAL',
                signature : '45678945612346gyzergczergczergf'
            }
		};
		this.basicRequest.method = 'GET';
		this.basicRequest.url = 'http://fakehost/protected';
		this.basicRequest.sign = function(privatekey) {
			var urlParts = url.parse(this.url, true);
			var params = urlParts.query || {};
			var queryString = Object.keys(params).sort().map(function(item, index, array) {
				return item+(params[item] ? '='+params[item] : '');
			}).join('&');
			var canonicalizedResource = urlParts.pathname + (queryString ? '?'+queryString : '');
			var self = this;
			var canonicalizedHeaders = Object.keys(this.headers).filter(function(item) {
				return item.startsWith('x-bm-');
			}).sort().map(function(item, index, array) {
				return item+':'+self.headers[item];
			}).join("\n");
			var hash = crypto.createSign('RSA-SHA256');
			var toSign = [
                          this.method,
                          (this.headers['content-md5'] || ''),
                          (this.headers['content-type'] || ''),
                          (this.headers['x-bm-date'] || this.headers['date']),
                          canonicalizedHeaders,
                          canonicalizedResource
                          ].join('\n');
			hash.update(toSign)
			var signature = hash.sign(privatekey, 'base64');
			this.authorization = {
				scheme : 'BWS',
	            credentials: {
	            	principal : 'KNOWN_PRINCIPAL',
	                signature : signature
	            }
			};
			this.headers.authorization = [this.authorization.scheme, [
                                                       this.authorization.credentials.principal,
                                                       this.authorization.credentials.signature].join(':')].join(' ');
		};		
		this.basicRequest.sign(this.privatekey);
		
		this.mock = {
				keyServer: {
					conf: {}
				}
			};
			
		var keyServer = this.mock.keyServer;
		
		function startKeyServer(cb) {
			// Start a minimal key server
			keyServer.server = http.createServer(function(req, res) {
				if(req.url == '/api/key/UNKNOWN_PRINCIPAL') {
					res.writeHead(404);
					res.end();
				} else if(req.url == '/api/key/500_PRINCIPAL') {
					res.writeHead(500);
					res.end();
				} else {
					res.writeHead(200, {'Content-Type': 'text/plain' });
					res.write('-----BEGIN RSA PUBLIC KEY-----\n'+
							'MIIBCgKCAQEApXKJfC0AYWk2Xwe6KbzOoijbHUNn//IUHsU8bxsoZ9L6szrzpZ0P\n'+
							'9GPc5v7R8za9afCxSRKWbFrXCgLko5M2t8ILggBnm7gdmB+Qt8EiHbIlRJsYyX7K\n'+
							'dh27IZCTD4l5KglpZ5JOhWxOldB4WD2qUTrRgHYRgbJkfhdODPJ7jjYWjn8GN4Kp\n'+
							'Z1cz/V1HjZT5HuqQ0BLSotslOAvWhqE2nWSfhg9Bf41sVTY0gw89QlUvJjOPteby\n'+
							'uMk9SniMXLNSKb4T409nDBL2wYPFi8JGR4rtXT/Vcvx9Cvs9RB/RLTWpf7qHF0tv\n'+
							'ZDUn3zPslAcAQnRmJCtgK3on2+ZUkkrErQIDAQAB\n'+
							'-----END RSA PUBLIC KEY-----\n', function() {
						res.end();
					});
				}
			});
			self.mock.keyServer.server.listen(function() { 
				keyServer.conf.port = keyServer.server.address().port;
				keyServer.conf.address = keyServer.server.address().address;
				keyServer.conf.family = keyServer.server.address().family;
				
				cb();
			});
		}
		
		var self = this;
		
		startKeyServer(function() {
			var ip = self.mock.keyServer.conf.address;
			if(self.mock.keyServer.conf.family== 'IPv6') {
				ip = '['+self.mock.keyServer.conf.address+']';
			}
			self.checker = checker(new self.log(), errors, {
				keypath: 'http://'+ip+':'+self.mock.keyServer.conf.port+'/api/key/%s'
			});
			callback();
		});
	},
	'reject request when public key is not found': function(test) {
		test.expect(2);
			
		var res = {};
		
		var req = this.basicRequest;
		req.authorization.credentials.principal = 'UNKNOWN_PRINCIPAL';
		
		this.checker(req, res, function(error) {
			test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
			test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
			test.done();
		});
	},
	'reject request when public key server return error': function(test) {
		test.expect(2);
			
		var res = {};
		
		var req = this.basicRequest;
		req.authorization.credentials.principal = '500_PRINCIPAL';

		this.checker(req, res, function(error) {
			test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
			test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
			test.done();
		});
	},
	'GET request': {
		setUp: function(callback) {
			this.basicRequest.headers = {
				'x-bm-date': new Date().toUTCString()
			};
			this.basicRequest.sign(this.privatekey);
			callback();
		},
		'reject request when the signature does not match (Not using content-md5 header)': function(test) {
			test.expect(2);
			
			var res = {};
			
			var req = this.basicRequest;
			req.authorization.credentials.signature = 'Not matching signature';
	
			this.checker(req, res, function(error) {
				test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
				test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
				test.done();
			});
		},
		'reject request when a x-bm-* header has been removed': function(test) {
			test.expect(2);
			
			var res = {};
			
			var req = this.basicRequest;
			req.headers['x-bm-particular'] = 'somevalue';
			req.sign(this.privatekey);
			delete req.headers['x-bm-particular'];
	
			this.checker(req, res, function(error) {
				test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
				test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
				test.done();
			});
		},
		'accept valid request with x-bm-date header (Not using content-md5 header)': function(test) {
			test.expect(1);
			
			var res = {};
			
			var req = this.basicRequest;
	
			this.checker(req, res, function(error) {
				test.ok(error===undefined, 'Must not raise an error');
				test.done();
			});
		},
		'accept valid request with date header (Not using content-md5 header)': function(test) {
			test.expect(1);
			
			var res = {};
			
			var req = this.basicRequest;
			req.headers.date = req.headers['x-bm-date'];
			delete(req.headers['x-bm-date']);
			req.sign(this.privatekey);
	
			this.checker(req, res, function(error) {
				test.ok(error===undefined, 'Must not raise an error');
				test.done();
			});
		}
	},
	'POST request': {
		setUp: function(callback) {
			this.basicRequest.method = 'POST';
			this.basicRequest.headers = {
				'x-bm-date': new Date().toUTCString(),
				'content-type': 'application/json'
			};
			this.basicRequest.post = {
				data: {key: 'value'},
				json: true
			};
			this.basicRequest.headers['content-md5'] = crypto.createHash('md5').update((this.basicRequest.post.json? JSON.stringify(this.basicRequest.post.data) : this.basicRequest.post.data)).digest("base64");
			this.basicRequest.sign(this.privatekey);
			callback();
		},
		'reject request when the signature does not match (Using content-md5 header)': function(test) {
			test.expect(2);
			
			var res = {};
			
			var req = this.basicRequest;
			req.authorization.credentials.signature = 'Not matching signature';
			
			this.checker(req, res, function(error) {
				test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
				test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
				test.done();
			});
		},
		'reject request when a x-bm-* header has been removed': function(test) {
			test.expect(2);
			
			var res = {};
			
			var req = this.basicRequest;
			req.headers['x-bm-particular'] = 'somevalue';
			req.sign(this.privatekey);
			delete req.headers['x-bm-particular'];
	
			this.checker(req, res, function(error) {
				test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
				test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
				test.done();
			});
		},
		'accept valid request with x-bm-date header (Using content-md5 header)': function(test) {
			test.expect(1);
			
			var res = {};
			
			var req = this.basicRequest;
	
			this.checker(req, res, function(error) {
				test.ok(error===undefined, 'Must not raise an error');
				test.done();
			});
		},
		'accept valid request with date header (Using content-md5 header)': function(test) {
			test.expect(1);
			
			var res = {};
			
			var req = this.basicRequest;
			req.headers.date = req.headers['x-bm-date'];
			delete(req.headers['x-bm-date']);
			req.sign(this.privatekey);
	
			this.checker(req, res, function(error) {
				test.ok(error===undefined, 'Must not raise an error');
				test.done();
			});
		}
	},
	'PUT request': {
		setUp: function(callback) {
			this.basicRequest.method = 'PUT';
			this.basicRequest.headers = {
				'x-bm-date': new Date().toUTCString(),
				'content-type': 'application/json'
			};
			this.basicRequest.post = {
				data: {key: 'value'},
				json: true
			};
			this.basicRequest.headers['content-md5'] = crypto.createHash('md5').update((this.basicRequest.post.json? JSON.stringify(this.basicRequest.post.data) : this.basicRequest.post.data)).digest("base64");
			
			this.basicRequest.sign(this.privatekey);
			callback();
		},
		'reject request when the signature does not match (Using content-md5 header)': function(test) {
			test.expect(2);
			
			var res = {};
			
			var req = this.basicRequest;
			req.authorization.credentials.signature = 'Not matching signature';
	
			this.checker(req, res, function(error) {
				test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
				test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
				test.done();
			});
		},
		'reject request when a x-bm-* header has been removed': function(test) {
			test.expect(2);
			
			var res = {};
			
			var req = this.basicRequest;
			req.headers['x-bm-particular'] = 'somevalue';
			req.sign(this.privatekey);
			delete req.headers['x-bm-particular'];
	
			this.checker(req, res, function(error) {
				test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
				test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
				test.done();
			});
		},
		'accept valid request with x-bm-date header (Using content-md5 header)': function(test) {
			test.expect(1);
			
			var res = {};
			
			var req = this.basicRequest;
	
			this.checker(req, res, function(error) {
				test.ok(error===undefined, 'Must not raise an error');
				test.done();
			});
		},
		'accept valid request with date header (Using content-md5 header)': function(test) {
			test.expect(1);
			
			var res = {};
			
			var req = this.basicRequest;
			req.headers.date = req.headers['x-bm-date'];
			delete(req.headers['x-bm-date']);
			req.sign(this.privatekey);
	
			this.checker(req, res, function(error) {
				test.ok(error===undefined, 'Must not raise an error');
				test.done();
			});
		}
	},
	'DELETE request': {
		setUp: function(callback) {
			this.basicRequest.method = 'DELETE';
			this.basicRequest.headers = {
				'x-bm-date': new Date().toUTCString()
			};
			this.basicRequest.sign(this.privatekey);
			callback();
		},
		'reject request when the signature does not match (Not using content-md5 header)': function(test) {
			test.expect(2);
			
			var res = {};
			
			var req = this.basicRequest;
			req.authorization.credentials.signature = 'Not matching signature';
	
			this.checker(req, res, function(error) {
				test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
				test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
				test.done();
			});
		},
		'reject request when a x-bm-* header has been removed': function(test) {
			test.expect(2);
			
			var res = {};
			
			var req = this.basicRequest;
			req.headers['x-bm-particular'] = 'somevalue';
			req.sign(this.privatekey);
			delete req.headers['x-bm-particular'];
	
			this.checker(req, res, function(error) {
				test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
				test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
				test.done();
			});
		},
		'accept valid request with x-bm-date header (Not using content-md5 header)': function(test) {
			test.expect(1);
			
			var res = {};
			
			var req = this.basicRequest;
	
			this.checker(req, res, function(error) {
				test.ok(error===undefined, 'Must not raise an error');
				test.done();
			});
		},
		'accept valid request with date header (Not using content-md5 header)': function(test) {
			test.expect(1);
			
			var res = {};
			
			var req = this.basicRequest;
			req.headers.date = req.headers['x-bm-date'];
			delete(req.headers['x-bm-date']);
			req.sign(this.privatekey);
	
			this.checker(req, res, function(error) {
				test.ok(error===undefined, 'Must not raise an error');
				test.done();
			});
		}
	},	
	tearDown: function(callback) {
		this.mock.keyServer.server.close(function() {
			callback();
		});
	}
}