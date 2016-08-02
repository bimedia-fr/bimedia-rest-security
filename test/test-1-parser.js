/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq: true,*/
"use strict";

var errors = require('restify-errors');
var parser = require('../lib/parser');
var Readable = require('stream').Readable;

module.exports = {

    'with default config': {
        setUp: function (callback) {
            this.log = function () {};
            this.log.prototype.info = this.log.prototype.warn = function () {};

            this.parser = parser(new this.log(), {});

            this.basicRequest = new Readable();
            this.basicRequest.push(null);
            this.basicRequest.headers = {
                'x-bm-date': new Date().toUTCString(),
                'authorization': 'BWS 123:45678945612346gyzergczergczergf'
            };

            callback();
        },
        'reject request on missing date header': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            delete req.headers['x-bm-date'];

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                test.equal(error.message, 'missing date header', 'Must raise an error with message missing date header');
                test.done();
            });

        },
        'reject request on outdated date header': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            req.headers['x-bm-date'] = new Date('2015-01-01 00:00:00').toUTCString();

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                test.equal(error.message, 'outdated request', 'Must raise an error with message outdated request');
                test.done();
            });

        },
        'reject request on invalid x-bm-date header': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            req.headers['x-bm-date'] = 'Not a valid date format !';

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                test.equal(error.message, 'invalid date header', 'Must raise an error with invalid date header');
                test.done();
            });
        },
        'reject request on invalid date header': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            delete req.headers['x-bm-date'];
            req.headers.date = 'Not a valid date format !';

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                test.equal(error.message, 'invalid date header', 'Must raise an error with invalid date header');
                test.done();
            });
        },
        'reject request on missing authorization header': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            delete req.headers.authorization;

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.InvalidCredentialsError, 'Must raise an InvalidCredentialsError');
                test.equal(error.message, 'missing credentials', 'Must raise an error with message missing credentials');
                test.done();
            });
        },
        'reject request on invalid authorization scheme': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            req.headers.authorization = 'AWS 123:45678945612346gyzergczergczergf';

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.InvalidCredentialsError, 'Must raise an InvalidCredentialsError');
                test.equal(error.message, 'invalid authorization scheme', 'Must raise an error with message invalid authorization scheme');
                test.done();
            });
        },
        'reject request on invalid authorization format': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            req.headers.authorization = '45678945612346gyzergczergczergf';

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.InvalidCredentialsError, 'Must raise an InvalidCredentialsError');
                test.equal(error.message, 'missing credentials', 'Must raise an error with message missing credentials');
                test.done();
            });
        },
        'x-bm-date is used in priority to date': function (test) {
            test.expect(1);

            var res = {};
            var req = this.basicRequest;
            req.headers.date = 'invalid date';

            this.parser(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        },
        'accept valid request': function (test) {
            test.expect(1);

            var res = {};
            var req = this.basicRequest;

            this.parser(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        },
        'accept request with both valid x-bm-date and date headers': function (test) {
            test.expect(1);

            var res = {};
            var req = this.basicRequest;
            req.headers.date = req.headers['x-bm-date'];

            this.parser(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        },
        'accept request with valid x-bm-date header and invalid date header': function (test) {
            test.expect(1);

            var res = {};
            var req = this.basicRequest;
            req.headers.date = 'Invalid date format';

            this.parser(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        },
        'reject request with valid date header and invalid x-bm-date header': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            req.headers.date = req.headers['x-bm-date'];
            req.headers['x-bm-date'] = 'Invalid date format';

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                test.equal(error.message, 'invalid date header', 'Must raise an error with invalid date header');
                test.done();
            });
        }
    },
    'with other http header prefix and scheme': {
        setUp: function (callback) {
            this.log = function () {};
            this.log.prototype.info = this.log.prototype.warn = function () {};

            this.parser = parser(new this.log(), {
                httpHeaderPrefix: 'x-other',
                scheme: 'OTHERSCHEME'
            });

            this.basicRequest = new Readable();
            this.basicRequest.push(null);
            this.basicRequest.headers = {
                'x-other-date': new Date().toUTCString(),
                'authorization': 'OTHERSCHEME 123:45678945612346gyzergczergczergf'
            };

            callback();
        },
        'reject request on missing date header': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            delete req.headers['x-other-date'];

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                test.equal(error.message, 'missing date header', 'Must raise an error with message missing date header');
                test.done();
            });

        },
        'reject request on outdated date header': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            req.headers['x-other-date'] = new Date('2015-01-01 00:00:00').toUTCString();

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                test.equal(error.message, 'outdated request', 'Must raise an error with message outdated request');
                test.done();
            });

        },
        'reject request on invalid x-other-date header': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            req.headers['x-other-date'] = 'Not a valid date format !';

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                test.equal(error.message, 'invalid date header', 'Must raise an error with invalid date header');
                test.done();
            });
        },
        'reject request on invalid date header': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            delete req.headers['x-other-date'];
            req.headers.date = 'Not a valid date format !';

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                test.equal(error.message, 'invalid date header', 'Must raise an error with invalid date header');
                test.done();
            });
        },
        'reject request on missing authorization header': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            delete req.headers.authorization;

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.InvalidCredentialsError, 'Must raise an InvalidCredentialsError');
                test.equal(error.message, 'missing credentials', 'Must raise an error with message missing credentials');
                test.done();
            });
        },
        'reject request on invalid authorization scheme': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            req.headers.authorization = 'AWS 123:45678945612346gyzergczergczergf';

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.InvalidCredentialsError, 'Must raise an InvalidCredentialsError');
                test.equal(error.message, 'invalid authorization scheme', 'Must raise an error with message invalid authorization scheme');
                test.done();
            });
        },
        'reject request on invalid authorization format': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            req.headers.authorization = '45678945612346gyzergczergczergf';

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.InvalidCredentialsError, 'Must raise an InvalidCredentialsError');
                test.equal(error.message, 'missing credentials', 'Must raise an error with message missing credentials');
                test.done();
            });
        },
        'x-bm-date is used in priority to date': function (test) {
            test.expect(1);

            var res = {};
            var req = this.basicRequest;
            req.headers.date = 'invalid date';

            this.parser(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        },
        'accept valid request': function (test) {
            test.expect(1);

            var res = {};
            var req = this.basicRequest;

            this.parser(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        },
        'accept request with both valid x-other-date and date headers': function (test) {
            test.expect(1);

            var res = {};
            var req = this.basicRequest;
            req.headers.date = req.headers['x-other-date'];

            this.parser(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        },
        'accept request with valid x-other-date header and invalid date header': function (test) {
            test.expect(1);

            var res = {};
            var req = this.basicRequest;
            req.headers.date = 'Invalid date format';

            this.parser(req, res, function (error) {
                test.ok(error === undefined, 'Must not raise an error');
                test.done();
            });
        },
        'reject request with valid date header and invalid x-other-date header': function (test) {
            test.expect(2);

            var res = {};
            var req = this.basicRequest;
            req.headers.date = req.headers['x-other-date'];
            req.headers['x-other-date'] = 'Invalid date format';

            this.parser(req, res, function (error) {
                test.ok(error instanceof errors.BadRequestError, 'Must raise a BadRequestError');
                test.equal(error.message, 'invalid date header', 'Must raise an error with invalid date header');
                test.done();
            });
        }
    },
    tearDown: function (callback) {
        callback();
    }
};
