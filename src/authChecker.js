/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq:true*/
"use strict";
var crypto = require('crypto'), errors = require('restify-errors');

module.exports = function (secretKeyResolver) {
    
    var resolver = secretKeyResolver || { resolve: function () { return null; } };
    
    function hash(stringtosign, key) {
        var hashMac = crypto.createHmac('sha256', key);
        return hashMac.update(stringtosign).digest('base64');
    }
    
    function bmzHeaders(req) {
        return [];
    }
    
    function getSignature(req, key) {
        var bobyMD5 = req.headers['content-md5'] || '';
        var elems = [req.method, bobyMD5, req.headers['content-type'] || '', req.headers.date || ''];
        elems = elems.concat(bmzHeaders(req));
        elems.push(req.url);
        return hash(elems.join('\n'), key);
    }
    
    return function _authChecker(req, res, next) {
        if (!req.authorization) {
            return next(new errors.InvalidCredentialsError('please provide credentials'));
        }
        var auth = req.authorization;
        if (auth.scheme != 'BWS') {
            return next(new errors.InvalidCredentialsError('invalid authorization scheme'));
        }
        var secret = resolver.resolve(auth.credentials.licence);
        if (!secret) {
            return next(new errors.NotAuthorizedError('invalid license'));
        }
        var signed = getSignature(req, secret);
        if (auth.credentials.signature === signed) {
            return next();
        }
        return next(new errors.NotAuthorizedError('invalid signature'));
    };
};