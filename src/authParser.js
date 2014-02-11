/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq:true*/
"use strict";
var url = require('url');

function parseParams(req) {
    return req.params || url.parse(req.url, true).query;
}

function parseFromHeader(authorization) {
    var auth = {};
    var pieces = authorization.split(' ', 2);
    if (!pieces || pieces.length !== 2) {
        return auth;
    }
    auth.scheme = pieces[0];
    var creds = pieces[1].split(':', 2);
    auth.credentials = {
        licence : creds[0],
        signature : creds[1]
    };
    return auth;
}


function parseFromParams(params) {
    var auth = {
        scheme : 'BWS'
    };
    auth.credentials = {
        licence : params.BWSlicence,
        signature : params.signature
    };
    return auth;
}

module.exports = function () {
    
    return function _authParser(req, res, next) {
        var auth = {}, licence, signature;
        
        if (req.headers && req.headers.authorization) {
            req.authorization = parseFromHeader(req.headers.authorization);
            return next();
        }
        
        var params = parseParams(req);
        if (params.BWSlicence && params.signature) {
            req.authorization =  parseFromParams(params);
            return next();
        }
        
        return next();
    };
};