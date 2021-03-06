/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq: true,*/
"use strict";

var http = require('http');
var request = require('request');
var errors = require('restify-errors');
var Readable = require('stream').Readable;
var crypto = require('crypto');
var url = require('url');
var fs = require('fs');

var checker = require('../lib/checker');

module.exports = {

    setUp: function (callback) {
        this.privatekey = fs.readFileSync(__dirname + '/priv.key');
        this.log = function () {};
        this.log.prototype.info = this.log.prototype.warn = function () {};

        this.basicRequest = new Readable();
        this.basicRequest.push(null);
        this.basicRequest.headers = {
            'x-bm-date': new Date().toUTCString(),
            'x-bm-terminal': 'mydevice'
        };
        this.basicRequest.authorization = {
            scheme: 'BWS',
            credentials: {
                principal: 'KNOWN_PRINCIPAL',
                signature: '45678945612346gyzergczergczergf',
                terminal: 'mydevice'
            }
        };
        this.basicRequest.method = 'GET';
        this.basicRequest.url = 'http://fakehost/protected';
        this.basicRequest.sign = function (privatekey) {
            var urlParts = url.parse(this.url, true);
            var params = urlParts.query || {};
            var queryString = Object.keys(params).sort().map(function (item, index, array) {
                return item + (params[item] ? '=' + params[item] : '');
            }).join('&');
            var canonicalizedResource = urlParts.pathname + (queryString ? '?' + queryString : '');
            var self = this;
            var canonicalizedHeaders = Object.keys(this.headers).filter(function (item) {
                return item.startsWith('x-bm-');
            }).sort().map(function (item, index, array) {
                return item + ':' + self.headers[item];
            }).join("\n");
            var hash = crypto.createSign('RSA-SHA256');
            var toSign = [
                this.method,
                (this.headers['content-md5'] || ''),
                (this.headers['content-type'] || ''),
                (this.headers['x-bm-date'] || this.headers.date),
                canonicalizedHeaders,
                canonicalizedResource
            ].join('\n');
            hash.update(toSign);
            var signature = hash.sign(privatekey, 'base64');
            this.authorization = {
                scheme: 'BWS',
                credentials: {
                    principal: 'KNOWN_PRINCIPAL',
                    signature: signature
                }
            };
            this.headers.authorization = [
                this.authorization.scheme, [
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

        var self = this;
        function startKeyServer(cb) {
            // Start a minimal key server
            keyServer.server = http.createServer(function (req, res) {
                if (req.url == '/api/key/UNKNOWN_PRINCIPAL') {
                    res.writeHead(404);
                    res.end();
                } else if (req.url == '/api/key/500_PRINCIPAL') {
                    res.writeHead(500);
                    res.end();
                } else {
                    res.writeHead(200, {
                        'Content-Type': 'text/plain'
                    });
                    fs.createReadStream(__dirname + '/pub.key').pipe(res);
                }
            });
            self.mock.keyServer.server.listen(function () {
                keyServer.conf.port = keyServer.server.address().port;
                keyServer.conf.address = keyServer.server.address().address;
                keyServer.conf.family = keyServer.server.address().family;

                cb();
            });
        }

        startKeyServer(function () {
            var ip = self.mock.keyServer.conf.address;
            if (self.mock.keyServer.conf.family == 'IPv6') {
                ip = '[' + self.mock.keyServer.conf.address + ']';
            }
            self.checker = checker({
                keypath: 'http://' + ip + ':' + self.mock.keyServer.conf.port + '/api/key/%s'
            }, new self.log()).middleware;
            callback();
        });
    },
    'reject request when public key is not found': function (test) {
        test.expect(2);

        var res = {};

        var req = this.basicRequest;
        req.authorization.credentials.principal = 'UNKNOWN_PRINCIPAL';

        this.checker(req, res, function (error) {
            test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
            test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
            test.done();
        });
    },
    'reject request when public key server return error': function (test) {
        test.expect(2);

        var res = {};

        var req = this.basicRequest;
        req.authorization.credentials.principal = '500_PRINCIPAL';

        this.checker(req, res, function (error) {
            test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
            test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
            test.done();
        });
    },
    'GET request': {
        setUp: function (callback) {
            this.basicRequest.headers = {
                'x-bm-date': new Date().toUTCString()
            };
            this.basicRequest.sign(this.privatekey);
            callback();
        },
        'reject request when the signature does not match (Not using content-md5 header)': function (test) {
            test.expect(2);

            var res = {};

            var req = this.basicRequest;
            req.authorization.credentials.signature = 'Not matching signature';

            this.checker(req, res, function (error) {
                test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
                test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                test.done();
            });
        },
        'reject request when a x-bm-* header has been removed': function (test) {
            test.expect(2);

            var res = {};

            var req = this.basicRequest;
            req.headers['x-bm-particular'] = 'somevalue';
            req.sign(this.privatekey);
            delete req.headers['x-bm-particular'];

            this.checker(req, res, function (error) {
                test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
                test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                test.done();
            });
        },
        'accept valid request with x-bm-date header (Not using content-md5 header)': function (test) {
            test.expect(1);

            var res = {};

            var req = this.basicRequest;

            this.checker(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        },
        'accept valid request with date header (Not using content-md5 header)': function (test) {
            test.expect(1);

            var res = {};

            var req = this.basicRequest;
            req.headers.date = req.headers['x-bm-date'];
            delete (req.headers['x-bm-date']);
            req.sign(this.privatekey);

            this.checker(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        }
    },
    'POST request': {
        setUp: function (callback) {
            this.basicRequest.method = 'POST';
            this.basicRequest.headers = {
                'x-bm-date': new Date().toUTCString(),
                'content-type': 'application/json'
            };
            this.basicRequest.post = {
                data: {
                    key: 'value'
                },
                json: true
            };
            this.basicRequest.headers['content-md5'] = crypto.createHash('md5').update((this.basicRequest.post.json ? JSON.stringify(this.basicRequest.post.data) : this.basicRequest.post.data)).digest("base64");
            this.basicRequest.sign(this.privatekey);
            callback();
        },
        'reject request when the signature does not match (Using content-md5 header)': function (test) {
            test.expect(2);

            var res = {};

            var req = this.basicRequest;
            req.authorization.credentials.signature = 'Not matching signature';

            this.checker(req, res, function (error) {
                test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
                test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                test.done();
            });
        },
        'reject request when a x-bm-* header has been removed': function (test) {
            test.expect(2);

            var res = {};

            var req = this.basicRequest;
            req.headers['x-bm-particular'] = 'somevalue';
            req.sign(this.privatekey);
            delete req.headers['x-bm-particular'];

            this.checker(req, res, function (error) {
                test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
                test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                test.done();
            });
        },
        'accept valid request with x-bm-date header (Using content-md5 header)': function (test) {
            test.expect(1);

            var res = {};

            var req = this.basicRequest;

            this.checker(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        },
        'accept valid request with date header (Using content-md5 header)': function (test) {
            test.expect(1);

            var res = {};

            var req = this.basicRequest;
            req.headers.date = req.headers['x-bm-date'];
            delete (req.headers['x-bm-date']);
            req.sign(this.privatekey);

            this.checker(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        }
    },
    'PUT request': {
        setUp: function (callback) {
            this.basicRequest.method = 'PUT';
            this.basicRequest.headers = {
                'x-bm-date': new Date().toUTCString(),
                'content-type': 'application/json'
            };
            this.basicRequest.post = {
                data: {
                    key: 'value'
                },
                json: true
            };
            this.basicRequest.headers['content-md5'] = crypto.createHash('md5').update((this.basicRequest.post.json ? JSON.stringify(this.basicRequest.post.data) : this.basicRequest.post.data)).digest("base64");

            this.basicRequest.sign(this.privatekey);
            callback();
        },
        'reject request when the signature does not match (Using content-md5 header)': function (test) {
            test.expect(2);

            var res = {};

            var req = this.basicRequest;
            req.authorization.credentials.signature = 'Not matching signature';

            this.checker(req, res, function (error) {
                test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
                test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                test.done();
            });
        },
        'reject request when a x-bm-* header has been removed': function (test) {
            test.expect(2);

            var res = {};

            var req = this.basicRequest;
            req.headers['x-bm-particular'] = 'somevalue';
            req.sign(this.privatekey);
            delete req.headers['x-bm-particular'];

            this.checker(req, res, function (error) {
                test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
                test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                test.done();
            });
        },
        'accept valid request with x-bm-date header (Using content-md5 header)': function (test) {
            test.expect(1);

            var res = {};

            var req = this.basicRequest;

            this.checker(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        },
        'accept valid request with date header (Using content-md5 header)': function (test) {
            test.expect(1);

            var res = {};

            var req = this.basicRequest;
            req.headers.date = req.headers['x-bm-date'];
            delete (req.headers['x-bm-date']);
            req.sign(this.privatekey);

            this.checker(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        }
    },
    'DELETE request': {
        setUp: function (callback) {
            this.basicRequest.method = 'DELETE';
            this.basicRequest.headers = {
                'x-bm-date': new Date().toUTCString()
            };
            this.basicRequest.sign(this.privatekey);
            callback();
        },
        'reject request when the signature does not match (Not using content-md5 header)': function (test) {
            test.expect(2);

            var res = {};

            var req = this.basicRequest;
            req.authorization.credentials.signature = 'Not matching signature';

            this.checker(req, res, function (error) {
                test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
                test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                test.done();
            });
        },
        'reject request when a x-bm-* header has been removed': function (test) {
            test.expect(2);

            var res = {};

            var req = this.basicRequest;
            req.headers['x-bm-particular'] = 'somevalue';
            req.sign(this.privatekey);
            delete req.headers['x-bm-particular'];

            this.checker(req, res, function (error) {
                test.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
                test.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                test.done();
            });
        },
        'accept valid request with x-bm-date header (Not using content-md5 header)': function (test) {
            test.expect(1);

            var res = {};

            var req = this.basicRequest;

            this.checker(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        },
        'accept valid request with date header (Not using content-md5 header)': function (test) {
            test.expect(1);

            var res = {};

            var req = this.basicRequest;
            req.headers.date = req.headers['x-bm-date'];
            delete (req.headers['x-bm-date']);
            req.sign(this.privatekey);

            this.checker(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        }
    },
    tearDown: function (callback) {
        this.mock.keyServer.server.close(function () {
            callback();
        });
    }
};
