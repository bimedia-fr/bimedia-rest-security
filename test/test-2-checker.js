const assert = require('assert');
var errors = require('restify-errors');
var Readable = require('stream').Readable;
var crypto = require('crypto');
var url = require('url');
var fs = require('fs');
var path = require('path');

var Checker = require('../lib/checker');

describe('Checker', ()=> {
    let privatekey = fs.readFileSync(__dirname + '/priv.key');
    let log = function () {};
    let basicRequest = new Readable();
    let checker;
    beforeEach((callback) => {
        log.prototype.info = log.prototype.warn = function () {};
        log.prototype.info = log.prototype.warn = console.log;

        basicRequest = new Readable();
        basicRequest.push(null);
        basicRequest.method = 'GET';
        basicRequest.headers = {
            'x-bm-date': new Date().toUTCString(),
            'x-bm-terminal': 'mydevice'
        };
        basicRequest.authorization = {
            scheme: 'BWS',
            credentials: {
                principal: 'KNOWN_PRINCIPAL',
                signature: '45678945612346gyzergczergczergf',
                terminal: 'mydevice'
            }
        };
        basicRequest.method = 'GET';
        basicRequest.url = 'http://fakehost/protected';
        basicRequest.sign = function (privatekey) {
            var urlParts = url.parse(basicRequest.url, true);
            var params = urlParts.query || {};
            var queryString = Object.keys(params).sort().map(function (item) {
                return item + (params[item] ? '=' + params[item] : '');
            }).join('&');
            var canonicalizedResource = urlParts.pathname + (queryString ? '?' + queryString : '');
            var canonicalizedHeaders = Object.keys(basicRequest.headers).filter(function (item) {
                return item.startsWith('x-bm-');
            }).sort().map(function (item, index, array) {
                return item + ':' + basicRequest.headers[item];
            }).join("\n");
            var hash = crypto.createSign('RSA-SHA256');
            var toSign = [
                basicRequest.method,
                (basicRequest.headers['content-md5'] || ''),
                (basicRequest.headers['content-type'] || ''),
                (basicRequest.headers['x-bm-date'] || basicRequest.headers.date),
                canonicalizedHeaders,
                canonicalizedResource
            ].join('\n');
            // console.log(JSON.stringify(toSign));
            hash.update(toSign);
            var signature = hash.sign(privatekey, 'base64');
            basicRequest.authorization = {
                scheme: 'BWS',
                credentials: {
                    principal: 'KNOWN_PRINCIPAL',
                    signature: signature
                }
            };
            basicRequest.headers.authorization = [
                basicRequest.authorization.scheme, [
                    basicRequest.authorization.credentials.principal,
                    basicRequest.authorization.credentials.signature].join(':')].join(' ');
        };
        // basicRequest.sign(privatekey);
        checker = Checker({
            keypath: 'http://localhost/api/key/%s'
        }, new log());
        checker.getPublicKey = (principal, terminal, cb) => {
            fs.readFile(path.join(__dirname, './pub.key'), {encoding: 'utf-8'}, (data) => {
                cb(null, data);
            });
        };
        callback();
    });
    describe('checks', () => {
        it('should reject request when public key is not found', (done) => {
            var res = {};
    
            var req = basicRequest;
            req.authorization.credentials.principal = 'UNKNOWN_PRINCIPAL';
            checker.getPublicKey = (principal, terminal, cb) => {
                cb();
            };
            checker.middleware(req, res, function (error) {
                assert.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError ');
                assert.strictEqual(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                done();
            });
        });

        it('should reject request when public key server return error', function (done) {
            var res = {};
            var req = basicRequest;
            req.authorization.credentials.principal = '500_PRINCIPAL';
            checker.getPublicKey = (principal, terminal, cb) => {
                cb(new Error('oups I did it again'));
            };
            checker.middleware(req, res, function (error) {
                assert.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError ');
                assert.strictEqual(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                done();
            });
        });
    });
    describe('GET request', () => {
        beforeEach(callback => {
            basicRequest.method='GET';
            basicRequest.headers = {
                'x-bm-date': new Date().toUTCString()
            };
            basicRequest.sign(privatekey);
            callback();
        });
        describe('with sign', () => {
            it('should reject request when the signature does not match (Not using content-md5 header)', function (done) {
                var res = {};
                var req = basicRequest;
                req.authorization.credentials.signature = 'Not matching signature';
    
                checker.middleware(req, res, function (error) {
                    assert.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError ' + error);
                    assert.strictEqual(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                    done();
                });
            });
            it('should reject request when a x-bm-* header has been removed', function (done) {
                var res = {};
                var req = basicRequest;
                req.headers['x-bm-particular'] = 'somevalue';
                
                req.sign(privatekey);
                delete req.headers['x-bm-particular'];
    
                checker.middleware(req, res, function (error) {
                    assert.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
                    assert.strictEqual(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                    done();
                });
            });
            it('should accept valid request with x-bm-date header (Not using content-md5 header)', function (done) {
                var res = {};
                var req = basicRequest;

                checker.getPublicKey = (principal, terminal, cb) => {
                    fs.readFile(__dirname + '/pub.key', {encoding: 'utf-8'}, cb);
                };

                checker.middleware(req, res, function (error) {
                    assert.ok(error === undefined, 'Must not raise an error ' + error);
                    done();
                });
            });
            it('should accept valid request with date header (Not using content-md5 header)', function (done) {
                var res = {};
                var req = basicRequest;
                req.headers.date = req.headers['x-bm-date'];
                delete (req.headers['x-bm-date']);
                checker.getPublicKey = (principal, terminal, cb) => {
                    fs.readFile(__dirname + '/pub.key', {encoding: 'utf-8'}, cb);
                };
                req.sign(privatekey);
    
                checker.middleware(req, res, function (error) {
                    assert.ok(error === undefined, 'Must not raise an error' + error);
                    done();
                });
            });
        });
    });
    describe('POST request', () => {
        beforeEach(callback => {
            basicRequest.method = 'POST';
            basicRequest.headers = {
                'x-bm-date': new Date().toUTCString(),
                'content-type': 'application/json'
            };
            basicRequest.post = {
                data: {
                    key: 'value'
                },
                json: true
            };
            basicRequest.headers['content-md5'] = crypto.createHash('md5').update((basicRequest.post.json ? JSON.stringify(basicRequest.post.data) : basicRequest.post.data)).digest("base64");
            basicRequest.sign(privatekey);
            callback();
        });
        describe('with sign and body', () => {
            it('reject request when the signature does not match (Using content-md5 header)', (done) => {
                var res = {};
                var req = basicRequest;
                req.authorization.credentials.signature = 'Not matching signature';
                checker.getPublicKey = (principal, terminal, cb) => {
                    fs.readFile(__dirname + '/pub.key', {encoding: 'utf-8'}, cb);
                };
                checker.middleware(req, res, function (error) {
                    assert.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
                    assert.strictEqual(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                    done();
                });
            });
            it('reject request when a x-bm-* header has been removed', (done) => {
                var res = {};
                var req = basicRequest;
                req.headers['x-bm-particular'] = 'somevalue';
                req.sign(privatekey);
                delete req.headers['x-bm-particular'];
                checker.getPublicKey = (principal, terminal, cb) => {
                    fs.readFile(__dirname + '/pub.key', {encoding: 'utf-8'}, cb);
                };
                checker.middleware(req, res, function (error) {
                    assert.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
                    assert.strictEqual(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                    done();
                });
            });
            it('accept valid request with x-bm-date header (Using content-md5 header)', (done) => {
                var res = {};
                var req = basicRequest;

                checker.getPublicKey = (principal, terminal, cb) => {
                    fs.readFile(__dirname + '/pub.key', {encoding: 'utf-8'}, cb);
                };
                checker.middleware(req, res, function (error) {
                    assert.ok(error === undefined, 'Must not raise an error');
                    done();
                });
            });
            it('accept valid request with date header (Using content-md5 header)', (done) => {
                var res = {};
                var req = basicRequest;
                req.headers.date = req.headers['x-bm-date'];
                delete (req.headers['x-bm-date']);
                req.sign(privatekey);
                checker.getPublicKey = (principal, terminal, cb) => {
                    fs.readFile(__dirname + '/pub.key', {encoding: 'utf-8'}, cb);
                };
                checker.middleware(req, res, function (error) {
                    assert.ok(error === undefined, 'Must not raise an error');
                    done();
                });
            });
        });
        describe('PUT request', () => {
            beforeEach(function (callback) {
                basicRequest.method = 'PUT';
                basicRequest.headers = {
                    'x-bm-date': new Date().toUTCString(),
                    'content-type': 'application/json'
                };
                basicRequest.post = {
                    data: {
                        key: 'value'
                    },
                    json: true
                };
                basicRequest.headers['content-md5'] = crypto.createHash('md5').update((basicRequest.post.json ? JSON.stringify(basicRequest.post.data) : basicRequest.post.data)).digest("base64");
    
                basicRequest.sign(privatekey);
                callback();
            });
            describe('check PUT request with body', () => {

                it('reject request when the signature does not match (Using content-md5 header)', (done) => {
                    var res = {};
                    var req = basicRequest;
                    req.authorization.credentials.signature = 'Not matching signature';
                    checker.getPublicKey = (principal, terminal, cb) => {
                        fs.readFile(__dirname + '/pub.key', {encoding: 'utf-8'}, cb);
                    };
                    checker.middleware(req, res, function (error) {
                        assert.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
                        assert.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                        done();
                    });
                });
                it('reject request when a x-bm-* header has been removed', (done) => {
                    var res = {};
                    var req = basicRequest;
                    req.headers['x-bm-particular'] = 'somevalue';
                    req.sign(privatekey);
                    delete req.headers['x-bm-particular'];
                    checker.getPublicKey = (principal, terminal, cb) => {
                        fs.readFile(__dirname + '/pub.key', {encoding: 'utf-8'}, cb);
                    };
                    checker.middleware(req, res, function (error) {
                        assert.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
                        assert.equal(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                        done();
                    });
                });
                it('accept valid request with x-bm-date header (Using content-md5 header)', (done) => {
                    var res = {};
                    var req = basicRequest;
                    checker.getPublicKey = (principal, terminal, cb) => {
                        fs.readFile(__dirname + '/pub.key', {encoding: 'utf-8'}, cb);
                    };
                    checker.middleware(req, res, function (error) {
                        assert.ok(error === undefined, 'Must not raise an error');
                        done();
                    });
                });
                it('accept valid request with date header (Using content-md5 header)', (done) => {
                    var res = {};
                    var req = basicRequest;
                    req.headers.date = req.headers['x-bm-date'];
                    delete (req.headers['x-bm-date']);
                    req.sign(privatekey);
                    checker.getPublicKey = (principal, terminal, cb) => {
                        fs.readFile(__dirname + '/pub.key', {encoding: 'utf-8'}, cb);
                    };
                    checker.middleware(req, res, function (error) {
                        assert.ok(error === undefined, 'Must not raise an error');
                        done();
                    });
                });
            });
        });
        describe('DELETE requets', () => {
            beforeEach(function (callback) {
                basicRequest.method = 'DELETE';
                basicRequest.headers = {
                    'x-bm-date': new Date().toUTCString()
                };
                basicRequest.sign(privatekey);
                callback();
            });
            describe('check DELETE requests', () => {
                it('reject request when the signature does not match (Not using content-md5 header)', (done) => {
                    var res = {};
                    var req = basicRequest;
                    req.authorization.credentials.signature = 'Not matching signature';
                    checker.getPublicKey = (principal, terminal, cb) => {
                        fs.readFile(__dirname + '/pub.key', {encoding: 'utf-8'}, cb);
                    };
                    checker.middleware(req, res, function (error) {
                        assert.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
                        assert.strictEqual(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                        done();
                    });
                });
            });
        });

        it('reject request when a x-bm-* header has been removed', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers['x-bm-particular'] = 'somevalue';
            req.sign(privatekey);
            delete req.headers['x-bm-particular'];
            checker.getPublicKey = (principal, terminal, cb) => {
                fs.readFile(__dirname + '/pub.key', {encoding: 'utf-8'}, cb);
            };  
            checker.middleware(req, res, function (error) {
                assert.ok(error instanceof errors.NotAuthorizedError, 'Must raise a NotAuthorizedError');
                assert.strictEqual(error.message, 'invalid signature', 'Must raise an error with message invalid signature');
                done();
            });
        });
        it('accept valid request with x-bm-date header (Not using content-md5 header)', (done) => {
            var res = {};
            var req = basicRequest;
            checker.getPublicKey = (principal, terminal, cb) => {
                fs.readFile(__dirname + '/pub.key', {encoding: 'utf-8'}, cb);
            };
            checker.middleware(req, res, function (error) {
                assert.ok(error === undefined, 'Must not raise an error');
                done();
            });
        });
        it('accept valid request with date header (Not using content-md5 header)', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers.date = req.headers['x-bm-date'];
            delete (req.headers['x-bm-date']);
            req.sign(privatekey);
            checker.getPublicKey = (principal, terminal, cb) => {
                fs.readFile(__dirname + '/pub.key', {encoding: 'utf-8'}, cb);
            };
            checker.middleware(req, res, function (error) {
                assert.ok(error === undefined, 'Must not raise an error');
                done();
            });
        });
    });
});
