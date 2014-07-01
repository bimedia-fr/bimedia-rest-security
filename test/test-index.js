/*jslint node : true, nomen: true, plusplus: true, vars: true*/
"use strict";

var bimedia = require('../src/index.js'),
    assert = require('assert'),
    vows = require('vows'),
    restify = require('restify'),
    request = require('request');

var server = restify.createServer({
    name: 'test-server',
    version: '0.0.1'
});

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

server.use(bimedia.authParser());
server.get('/', bimedia.authChecker(resolver()), function (req, res) {
    res.end();
});

server.listen(process.env.PORT || 5000, function () {
    //console.log("sample server started.");
});

var apiurl = 'http://' + (process.env.IP || 'localhost') + ':' + (process.env.PORT || 5000);
var apiTest = {
    general: function (method, url, headers, cb) {
        request({
            method: method,
            url: apiurl + (url || ''),
            headers : headers
        }, cb);
    },
    get: function (url, data, cb) {
        apiTest.general('GET', url, data, cb);
    },
    assertStatus : function (code) {
        return function (err, res, body) {
            assert.equal(res.statusCode, code);
        };
    },
    assertBody : function (expected) {
        return function (err, res, body) {
            assert.equal(body, expected);
        };
    }
};

vows.describe('security plugin').addBatch({
    'if auth header is absent' : {
        topic : function () {
            apiTest.get('/', null, this.callback);
        },
        'sends 401 ' : apiTest.assertStatus(401),
        'with an error message : `missing credentials`' : function (err, res, body) {
            var parsed = JSON.parse(body);
            assert.equal(parsed.message, 'missing credentials');
        }
    },
    'if auth header is an invalid a scheme' : {
        topic : function () {
            apiTest.get('/', {'Authorization': 'AWS dlms:zdvml'}, this.callback);
        },
        'sends 401' : apiTest.assertStatus(401),
        'with an error message : `invalid authorization scheme`' : function (err, res, body) {
            var parsed = JSON.parse(body);
            assert.equal(parsed.message, 'invalid authorization scheme');
        }
    },
    'if auth scheme is *BWS* and license is invalid' : {
        topic : function () {
            apiTest.get('/', {'Authorization': 'BWS dlms:zdvml'}, this.callback);
        },
        'sends 403' : apiTest.assertStatus(403),
        'with an error message : `invalid license`' : function (err, res, body) {
            assert.ok(body);
            var parsed = JSON.parse(body);
            assert.equal(parsed.message, 'invalid license');
        }
    },
    'if auth scheme is *BWS* with a valid license and invalid signature' : {
        topic : function () {
            apiTest.get('/', {'Authorization': 'BWS 20130404004463:zdvml'}, this.callback);
        },
        'sends 403' : apiTest.assertStatus(403),
        'with an error message : `invalid signature`' : function (err, res, body) {
            assert.ok(body);
            var parsed = JSON.parse(body);
            assert.equal(parsed.message, 'invalid signature');
        }
    },
    'if auth scheme is *BWS* with a valid license and signature' : {
        topic : function () {
            apiTest.get('/', {
                'Authorization': 'BWS 20130404004463:zAi7p4aICGDk/S/zT8snQqsqbxke/ktLlfwis0pCN54=',
                "x-bm-date": 'Tue, 4 Feb 2014 14:36:42 +0000'
            }, this.callback);
        },
        'sends 200' : apiTest.assertStatus(200)
    }
})['export'](module);

