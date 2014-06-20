/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq:true*/
"use strict";

// Main module
// --------------------


// ###Usage :
// ```js
//  var bimedia = require('bimediaSecurity')
//  var server = restify.createServer();
//  server.use(bimedia.authParser());
//
//  server.get('/', bimedia.authChecker(resolver()), 
//      function (req, res) {
//        res.end();
//      });
// ```


// Exports sub-modules.
// Requires :
// * [authChecker.js](authChecker.html) pour la vérifcation de l'authentification.
// * [authParser.js](authParser.html) pour l'analyse de la requête.
module.exports = {
    authChecker: require('./authChecker'),
    authParser: require('./authParser')
};
