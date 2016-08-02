/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq: true,*/
"use strict";

var parser = require('./parser');
var checker = require('./checker');

module.exports = function setup(options, imports, register) {
	
    var rest = imports.rest;
    var log = imports.log.getLogger(options.name || 'auth');
        
    rest.pre(parser(options, log));
    rest.pre(checker(options, log));
    
    register();
};

module.exports.consumes = ['rest', 'log'];
module.exports.parser = parser;
module.exports.checker = checker;
