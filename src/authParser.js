/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq:true*/
"use strict";
var url = require('url');

// Module AuthParser
// ------------------

//Module d'analyse des entêtes http pour récupérer les informations d'authentification.

// On exporte la fonction d'analyse de la requete.
module.exports = function () {
    // Méthode utilitaire pour récupérer les paramètres de requete.
    //Il est possible que les paramètres aient déjà été parsés par un autre module.
    function parseParams(req) {
        return req.params || url.parse(req.url, true).query;
    }

    // Méthode permettant de lire les informations d'authorisation depuis l'entêtes HTTP `Authorization`.
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

    // Méthode permettant de lire les informations d'authorisation depuis les paramètres de requête.
    // Les paramètres exploités sont les suivants :
    // * BWSlicence : la licence
    // * signature : la signature de la requête
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
    
    // Fonction d'analyse des information d'authentification.
    return function _authParser(req, res, next) {
        var auth = {}, licence, signature;
        
        if (req.headers && req.headers.authorization) {
            req.authorization = parseFromHeader(req.headers.authorization);
            return next();
        }
        
        var params = parseParams(req);
        if (params.BWSlicence && params.signature) {
            req.authorization = parseFromParams(params);
            return next();
        }
        
        return next();
    };
};