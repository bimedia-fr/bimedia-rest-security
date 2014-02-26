/*jslint node : true, nomen: true, plusplus: true, vars: true*/
"use strict";

var authParser = require('../src/authParser.js'),
    assert = require('assert'),
    vows = require('vows');

var req = {
    headers : {authorization: 'BWS mdzmefapzo:dzbn'}
};

var reqAlt = {
    params : {
        BWSlicence: 'mdzmefapzo',
        signature: 'dzbn'
    }
};

var reqUrl = {
    url : '/?BWSlicence=mdzmefapzo&signature=dzbn&timestamp=1393448588772'
};


vows.describe('BWS auth parser').addBatch({
    'auth parser' : {
        topic : authParser,
        
        'can receieve request with an authorization header' : {
            topic : function (authParser) {
                authParser(req, {send : function () {}}, this.callback);
            },
            'and add authorization' : {
                'with scheme `BWS`' : function () {
                    assert.equal('BWS', req.authorization.scheme);
                },
                'with a `credentials` element ' : function () {
                    assert.ok(req.authorization.credentials);
                },
                'credentials ' : {
                    topic : function () {
                        return req.authorization.credentials;
                    },
                    'has a licence element whose value is `mdzmefapzo` ' : function (creds) {
                        assert.ok(creds.licence);
                        assert.equal('mdzmefapzo', creds.licence);
                    },
                    'has a signature element whose value is `dzbn` ' : function (creds) {
                        assert.ok(creds.signature);
                        assert.equal('dzbn', creds.signature);
                    }
                }
            }
        },
        'can receieve request params already parsed' : {
            topic : function (authParser) {
                authParser(reqAlt, {send : function () {}}, this.callback);
            },
            'and add authorization' : {
                'with scheme `BWS`' : function () {
                    assert.equal('BWS', reqAlt.authorization.scheme);
                },
                'with a `credentials` element ' : function () {
                    assert.ok(reqAlt.authorization.credentials);
                },
                'credentials ' : {
                    topic : function () {
                        return reqAlt.authorization.credentials;
                    },
                    'has a licence element whose value is `mdzmefapzo` ' : function (creds) {
                        assert.ok(creds.licence);
                        assert.equal('mdzmefapzo', creds.licence);
                    },
                    'has a signature element whose value is `dzbn` ' : function (creds) {
                        assert.ok(creds.signature);
                        assert.equal('dzbn', creds.signature);
                    }
                }
            }
        },
        'can receieve request with unparsed parameters from url' : {
            topic : function (authParser) {
                authParser(reqUrl, {send : function () {}}, this.callback);
            },
            'and add authorization' : {
                'with scheme `BWS`' : function () {
                    assert.equal('BWS', reqUrl.authorization.scheme);
                },
                'with a `credentials` element ' : function () {
                    assert.ok(reqUrl.authorization.credentials);
                },
                'credentials ' : {
                    topic : function () {
                        return reqUrl.authorization.credentials;
                    },
                    'has a licence element whose value is `mdzmefapzo` ' : function (creds) {
                        assert.ok(creds.licence);
                        assert.equal('mdzmefapzo', creds.licence);
                    },
                    'has a signature element whose value is `dzbn` ' : function (creds) {
                        assert.ok(creds.signature);
                        assert.equal('dzbn', creds.signature);
                    }
                }
            }
        }
    }
}).export(module);