/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq:true*/
"use strict";
var crypto = require('crypto'), errors = require('restify-errors');

// Module AuthChecker
// ------------------

// Module de vérification des informations d'authentification.

// Le module prends en paramètre un objet [secretKeyResolver](SecretKeyResolver.html) capable de récupérer une clé privé avec la licence 
// reçue du client.
module.exports = function (secretKeyResolver) {
    
    // Si le resolver passé en paramètres est vide, on utilise un implementation de repli
    // qui retourne toujours null.
    var resolver = secretKeyResolver || { resolve: function () { return null; } };
    
    // Réalise le hash pour déterminer la signature de la requête.
    // On utilise l'algorithme `SHA256`.
    function hash(stringtosign, key) {
        var hashMac = crypto.createHmac('sha256', key);
        return hashMac.update(stringtosign).digest('base64');
    }
    
    // récupère la liste des entêtes additionnelles à prendre en compte dans la signature.
    function bmzHeaders(req) {
        return [];
    }
    
    // extrait les informations à signer de la requête `req` et la signe avec la clé `key`.
    function getSignature(req, key) {
        var bobyMD5 = req.headers['content-md5'] || '';
        var elems = [req.method, bobyMD5, req.headers['content-type'] || '', req.headers.date || ''];
        elems = elems.concat(bmzHeaders(req));
        elems.push(req.url);
        return hash(elems.join('\n'), key);
    }
    
    // Fonction permettant de vérifier que la signature de la requête est conforme à la signature du client.
    return function _authChecker(req, res, next) {
        if (!req.authorization) {
            return next(new errors.InvalidCredentialsError('missing credentials'));
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