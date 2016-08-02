/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq: true,*/
"use strict";

var parser = require('./parser');
var checker = require('./checker');

module.exports = function setup(options, imports, register) {
	
    var rest = imports.rest;
    var log = imports.log.getLogger(options.name || 'auth');
        
    rest.pre(parser(log, options));
    rest.pre(checker(log, options));
    
    register();
};

module.exports.consumes = ['rest', 'log'];
