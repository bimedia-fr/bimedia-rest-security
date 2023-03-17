/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq: true,*/
"use strict";

var url = require('url');
var http = require('http');
var https = require('https');
var crypto = require('crypto');
var util = require("util");
var errors = require('restify-errors');

module.exports = function (options, log) {
    options = options || {};
    var headerPrefix = options.httpHeaderPrefix || 'x-bm';

    function getPublicKey(principal, terminal, cb) {
        if (typeof terminal == 'function') {
            cb = terminal;
            terminal = null;
        }
        var agent = options.keypath.indexOf('https') == 0 ? https : http;
        var req = agent.get(util.format(options.keypath, principal, terminal || ''), function (res) {
            var body = '';
            if (res.statusCode != 200) {
                return cb(new Error('Invalid status code ' + res.statusCode));
            }
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                body += chunk;
            });
            res.once('end', function () {
                cb(null, body);
            });
        });
        req.on('error', function (err) {
            return cb(err);
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
        var queryString = Object.keys(params).sort().map(function (item) {
            return item + (params[item] ? '=' + params[item] : '');
        }).join('&');

        var headers = req.headers || {};
        var canonicalizedResource = (headers['x-forwarded-uri'] || '') + urlParts.pathname + (queryString ? '?' + queryString : '');
        var canonicalizedHeaders = Object.keys(headers).filter(function (item) {
            return item.startsWith(headerPrefix + '-');
        }).sort().map(function (item, index, array) {
            return item + ':' + headers[item];
        }).join("\n");

        return [
            req.method,
            req.headers['content-md5'] || '',
            req.headers['content-type'] || '',
            req.headers[headerPrefix + '-date'] || req.headers.date,
            canonicalizedHeaders,
            canonicalizedResource
        ].join("\n");
    }

    let api = {
        getPublicKey : getPublicKey,
        verify: verify,
        canonicalize : canonicalize,
        middleware: function check(req, res, next) {

            var principal = req.authorization.credentials.principal;
            var terminal = req.authorization.credentials.terminal;

            api.getPublicKey(principal, terminal, function (error, publickey) {
                if (error || !publickey) {
                    // Invalid principal
                    log.info(principal, 'Public key not found for', terminal,':', error && error.message);
                    next(new errors.NotAuthorizedError('invalid signature'));
                    return;
                }

                var toSign = api.canonicalize(req);

                if (!api.verify(toSign, req.authorization.credentials.signature, publickey)) {
                    // Invalid signature
                    log.warn(principal, 'Invalid signature');
                    next(new errors.NotAuthorizedError('invalid signature'));
                    return;
                }
                next();
            });
        }
    };

    return api;
};
