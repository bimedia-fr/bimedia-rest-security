const assert = require('assert');
var errors = require('restify-errors');
var Parser = require('../lib/parser');
var Readable = require('stream').Readable;

describe('Parser', () => {
    beforeEach((callback) => {
        log = function () {};
        log.prototype.info = log.prototype.warn = function () {};

        parser = Parser({}, new log()).middleware;

        basicRequest = new Readable();
        basicRequest.push(null);
        basicRequest.headers = {
            'x-bm-date': new Date().toUTCString(),
            'x-bm-terminal': 'tablettetutu',
            'authorization': 'BWS 123:45678945612346gyzergczergczergf'
        };
        callback();
    });
    describe('default config', () =>{
        it('should reject request on missing date header', (done) => {
            var res = {};
            var req = basicRequest;
            delete req.headers['x-bm-date'];

            parser(req, res, function (error) {
                assert.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                assert.strictEqual(error.message, 'missing date header', 'Must raise an error with message missing date header');
                done();
            });
        }),
        it('should reject request on outdated date header', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers['x-bm-date'] = new Date('2015-01-01 00:00:00').toUTCString();

            parser(req, res, function (error) {
                assert.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                assert.strictEqual(error.message, 'outdated request', 'Must raise an error with message outdated request');
                done();
            });
        }),
        it('should reject request on invalid x-bm-date header', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers['x-bm-date'] = 'Not a valid date format !';

            parser(req, res, function (error) {
                assert.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                assert.equal(error.message, 'invalid date header', 'Must raise an error with invalid date header');
                done();
            });
        }),
        it('reject request on invalid date header', (done) => {
            var res = {};
            var req = basicRequest;
            delete req.headers['x-bm-date'];
            req.headers.date = 'Not a valid date format !';

            parser(req, res, function (error) {
                assert.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                assert.strictEqual(error.message, 'invalid date header', 'Must raise an error with invalid date header');
                done();
            });
        }),
        it('reject request on missing authorization header', (done) => {
            var res = {};
            var req = basicRequest;
            delete req.headers.authorization;

            parser(req, res, function (error) {
                assert.ok(error instanceof errors.InvalidCredentialsError, 'Must raise an InvalidCredentialsError');
                assert.strictEqual(error.message, 'missing credentials', 'Must raise an error with message missing credentials');
                done();
            });
        }),
        it('reject request on invalid authorization scheme', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers.authorization = 'AWS 123:45678945612346gyzergczergczergf';

            parser(req, res, function (error) {
                assert.ok(error instanceof errors.InvalidCredentialsError, 'Must raise an InvalidCredentialsError');
                assert.equal(error.message, 'invalid authorization scheme', 'Must raise an error with message invalid authorization scheme');
                done();
            });
        }),
        it('reject request on invalid authorization format', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers.authorization = '45678945612346gyzergczergczergf';

            parser(req, res, function (error) {
                assert.ok(error instanceof errors.InvalidCredentialsError, 'Must raise an InvalidCredentialsError');
                assert.strict(error.message, 'missing credentials', 'Must raise an error with message missing credentials');
                done();
            });
        }),
        it('x-bm-date is used in priority to date', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers.date = 'invalid date';

            parser(req, res, function (error) {
                assert.ok(error === undefined, 'Must not raise an error');
                done();
            });
        }),
        it('accept valid request', (done) => {
            var res = {};
            var req = basicRequest;

            parser(req, res, function (error) {
                assert.ok(error === undefined, 'Must not raise an error');
                assert.equal('tablettetutu', req.authorization.credentials.terminal);
                assert.equal('123', req.authorization.credentials.principal);
                done();
            });
        }),
        it('accept request with both valid x-bm-date and date headers', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers.date = req.headers['x-bm-date'];

            parser(req, res, function (error) {
                assert.ok(error === undefined, 'Must not raise an error');
                done();
            });
        });
        it('accept request with valid x-bm-date header and invalid date header', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers.date = 'Invalid date format';

            parser(req, res, function (error) {
                assert.ok(error === undefined, 'Must not raise an error');
                done();
            });
        });
        it('reject request with valid date header and invalid x-bm-date header', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers.date = req.headers['x-bm-date'];
            req.headers['x-bm-date'] = 'Invalid date format';

            parser(req, res, function (error) {
                assert.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                assert.strictEqual(error.message, 'invalid date header', 'Must raise an error with invalid date header');
                done();
            });
        });
    });
});

describe('Parser', () => {
    let log = function () {}; 
    let parser, basicRequest;
    beforeEach(function (callback) {
        log.prototype.info = log.prototype.warn = function () {};
        // log.prototype.info = log.prototype.warn = console.log;

        parser = Parser({
            httpHeaderPrefix: 'x-other',
            scheme: 'OTHERSCHEME'
        }, new log()).middleware;

        basicRequest = new Readable();
        basicRequest.push(null);
        basicRequest.headers = {
            'x-other-date': new Date().toUTCString(),
            'authorization': 'OTHERSCHEME 123:45678945612346gyzergczergczergf'
        };
        callback();
    });
    describe('with other http header prefix and scheme', ()=> {
        it('should reject request on missing date header', (done) => {
            var res = {};
            var req = basicRequest;
            delete req.headers['x-other-date'];
    
            parser(req, res, function (error) {
                assert.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                assert.strictEqual(error.message, 'missing date header', 'Must raise an error with message missing date header');
                done();
            });
        });
        it('should reject request on outdated date header', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers['x-other-date'] = new Date('2015-01-01 00:00:00').toUTCString();
    
            parser(req, res, function (error) {
                assert.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                assert.strictEqual(error.message, 'outdated request', 'Must raise an error with message outdated request');
                done();
            });
        });
        it('should reject request on invalid x-other-date header', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers['x-other-date'] = 'Not a valid date format !';
    
            parser(req, res, function (error) {
                assert.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                assert.strictEqual(error.message, 'invalid date header', 'Must raise an error with invalid date header');
                done();
            });
        });
        it('should reject request on invalid date header', (done) => {
            var res = {};
            var req = basicRequest;
            delete req.headers['x-other-date'];
            req.headers.date = 'Not a valid date format !';
    
            parser(req, res, function (error) {
                assert.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                assert.equal(error.message, 'invalid date header', 'Must raise an error with invalid date header');
                done();
            });
        });
        it('should reject request on missing authorization header', (done) => {
            var res = {};
            var req = basicRequest;
            delete req.headers.authorization;
    
            parser(req, res, function (error) {
                assert.ok(error instanceof errors.InvalidCredentialsError, 'Must raise an InvalidCredentialsError');
                assert.strictEqual(error.message, 'missing credentials', 'Must raise an error with message missing credentials');
                done();
            });
        });
        it('should reject request on invalid authorization scheme', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers.date = new Date().toUTCString();
            req.headers.authorization = 'AWS 123:45678945612346gyzergczergczergf';
            
            parser(req, res, function (error) {
                assert.ok(error instanceof errors.InvalidCredentialsError, 'Must raise an InvalidCredentialsError');
                assert.strictEqual(error.message, 'invalid authorization scheme', 'Must raise an error with message invalid authorization scheme');
                done();
            });
        });
        it('should reject request on invalid authorization format', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers.authorization = '45678945612346gyzergczergczergf';
    
            parser(req, res, function (error) {
                assert.ok(error instanceof errors.InvalidCredentialsError, 'Must raise an InvalidCredentialsError');
                assert.strictEqual(error.message, 'missing credentials', 'Must raise an error with message missing credentials');
                done();
            });
        });
        it('should use x-bm-date in priority to date', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers.date = 'invalid date';
    
            parser(req, res, function (error) {
                assert.ok(error === undefined, 'Must not raise an error');
                done();
            });
        });
        it('should accept valid request', (done) => {
            var res = {};
            var req = basicRequest;
    
            parser(req, res, function (error) {
                assert.ok(error === undefined, 'Must not raise an error');
                done();
            });
        });
        it('should accept request with both valid x-other-date and date headers', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers.date = req.headers['x-other-date'];
    
            parser(req, res, function (error) {
                assert.ok(error === undefined, 'Must not raise an error');
                done();
            });
        });
        it('should accept request with valid x-other-date header and invalid date header', (done) => {
            var res = {};
            var req = basicRequest;
            req.headers.date = 'Invalid date format';
    
            parser(req, res, function (error) {
                
                assert.ok(error === undefined, 'Must not raise an error ' + error);
                done();
            });
        });
        it('should reject request with valid date header and invalid x-other-date header', function (done) {
            var res = {};
            var req = basicRequest;
            req.headers.date = req.headers['x-other-date'];
            req.headers['x-other-date'] = 'Invalid date format';
    
            parser(req, res, function (error) {
                assert.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                assert.strictEqual(error.message, 'invalid date header', 'Must raise an error with invalid date header');
                done();
            });
        });
    });
});