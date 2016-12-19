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

    function getPublicKey(principal, cb) {
        var agent = options.keypath.indexOf('https') == 0 ? https : http;
        var req = agent.get(util.format(options.keypath, principal), function (res) {
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
        var queryString = Object.keys(params).sort().map(function (item, index, array) {
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

    return {
        getPublicKey : getPublicKey,
        verify: verify,
        canonicalize : canonicalize,
        middleware: function check(req, res, next) {

            var principal = req.authorization.credentials.principal;
            getPublicKey(principal, function (error, publickey) {
                if (error || !publickey) {
                    // Invalid principal
                    log.info(principal, 'Public key not found', error && error.message);
                    next(new errors.NotAuthorizedError('invalid signature'));
                    return;
                }

                var toSign = canonicalize(req);

                if (!verify(toSign, req.authorization.credentials.signature, publickey)) {
                    // Invalid signature
                    log.warn(principal, 'Invalid signature');
                    next(new errors.NotAuthorizedError('invalid signature'));
                    return;
                }
                next();
            });
        }
    };
};
