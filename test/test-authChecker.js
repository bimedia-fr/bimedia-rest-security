/*jslint node : true, nomen: true, plusplus: true, vars: true*/
"use strict";
var authChecker = require('../src/authChecker.js'),
    assert = require('assert'),
    vows = require('vows');

var resolver = function () {
    var map = {
        'licence' : 'mysupersecretkey',
        '20130404004463' : 'mysecretkey'
    };
    return {
        'resolve' : function (licence) {
            return map[licence];
        }
    };
};

vows.describe('BWS auth checker').addBatch({
    'authChecker' : {
        topic : function () {
            return authChecker(resolver());
        },
        'can check requests without authorization': {
            topic: function (checker) {
                var self = this;
                return checker({}, {}, function (err) { self.callback(null, err); });
            },
            'and returns `401, not authorized, missing credentials.`': function (error) {
                assert.equal(error.statusCode, 401);
                assert.equal(error.message, 'missing credentials');
            }
        },
        'can check requests with invalid authorization scheme': {
            topic: function (checker) {
                var self = this;
                return checker({ authorization : {scheme: 'AWS'} }, {}, function (err) { self.callback(null, err); });
            },
            'and returns `401, not authorized, invalid authorization scheme`': function (error) {
                assert.equal(error.statusCode, 401);
                assert.equal(error.message, 'invalid authorization scheme');
            }
        },
        'can check requests with no licence': {
            topic: function (checker) {
                var self = this;
                return checker({ authorization : {
                    scheme: 'BWS',
                    credentials: {licence: ''}
                } }, {}, function (err) { self.callback(null, err); });
            },
            'and returns `403, forbidden, invalid license.`': function (error) {
                assert.equal(error.statusCode, 403);
                assert.equal(error.message, 'invalid license');
            }
        },
        'can check requests with invalid licence': {
            topic: function (checker) {
                var self = this;
                return checker({ authorization : {
                    scheme: 'BWS',
                    credentials: {licence: 'a'}
                } }, {}, function (err) { self.callback(null, err); });
            },
            'and returns `403, forbidden, invalid license.`': function (error) {
                assert.equal(error.statusCode, 403);
                assert.equal(error.message, 'invalid license');
            }
        },
        'can check requests with an invalid signature': {
            topic: function (checker) {
                var self = this;
                return checker({
                    method: 'GET',
                    url : '/avoirs/0000029',
                    headers: {
                        date: 'Tue, 4 Feb 2014 14:36:42 +0000'
                    },
                    authorization : {
                        scheme: 'BWS',
                        credentials: {
                            licence: '20130404004463',
                            signature: 'skldnvsdklvn'
                        }
                    }
                }, {}, function (err) { self.callback(null, err); });
            },
            'and returns `403, forbidden, invalid signature.`': function (error) {
                assert.equal(error.statusCode, 403);
                assert.equal(error.message, 'invalid signature');
            }
        },
        'can check requests with a valid licence': {
            topic: function (checker) {
                return checker({
                    method: 'GET',
                    url : '/avoirs/0000029',
                    headers: {
                        date: 'Tue, 7 Feb 2014 14:36:42 +0000'
                    },
                    authorization : {
                        scheme: 'BWS',
                        credentials: {
                            licence: '20130404004463',
                            signature: '+9ZeL8502UMDftslyJVy85M09O98ByCcEIfERVzpFcU='
                        }
                    }
                }, {}, this.callback);
            },
            'and calls `next` to allow access ': function () {
            }
        }
    }
}).export(module);