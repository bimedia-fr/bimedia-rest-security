/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq: true,*/
"use strict";

var Parser = require('./parser');
var Checker = require('./checker');

module.exports = function setup(options, imports, register) {

    var rest = imports.rest;
    var log = imports.log.getLogger(options.name || 'auth');
    var parser = new Parser(options, log);
    var checker = new Checker(options, log);
        
    rest.pre(parser.middleware);
    rest.pre(checker.middleware);
    
    register();
};

module.exports.consumes = ['rest', 'log'];
module.exports.Parser = Parser;
module.exports.Checker = Checker;
