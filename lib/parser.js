/*jslint node : true, nomen: true, plusplus: true, vars: true, eqeq: true,*/
"use strict";

module.exports = function(log, errors, options) {
	
	function checkMandatoryHeaders(req) {
		
		if(!(req.headers['x-bm-date'] || req.headers['date'])) {
			log.info('Missing date header');
        	return new errors.BadRequestError('missing date header');
		}
		
		if(!req.headers['authorization']) {
			log.info('Missing authorization header');
			return new errors.InvalidCredentialsError('missing credentials');
		}
		
		if(['POST', 'PUT'].indexOf(req.method) >= 0 && !req.headers['content-md5']) {
			log.info('Missing content-md5 header');
			return new errors.BadRequestError('missing content-md5 header');
		}
	}
	
	function checkDateHeader(req) {
		
		var header = (req.headers['x-bm-date']) ? 'x-bm-date': 'date';		
		var dateStr = req.headers[header];
		var date = Date.parse(dateStr) || 0;
    	var timestamp;
    	
    	// Check if date header is a valid date
    	if(!(timestamp = parseInt(Math.round(date/1000), 10))) {
    		log.info('Invalid date header:', header+':', dateStr);
    		return new errors.BadRequestError('invalid date header');
    	}
    	
    	// Check if date header is in validity range
    	var deltaTime = timestamp - Math.round(Date.now()/1000);
    	if(Math.abs(deltaTime) > options.timestampValidity) {
    		log.warn('Outdated request:', header+':', dateStr, 'delta:', deltaTime);
        	return new errors.BadRequestError('outdated request');
    	}
	}
	
	function extractAuthInfos(req) {	
		// Using headers
    	var pieces = req.headers.authorization.split(' ', 2);
        if (pieces && pieces.length == 2) {
            var creds = pieces[1].split(':', 2);
            req.authorization = {
                scheme : pieces[0],
                credentials: {
                	principal : creds[0],
	                signature : creds[1]
	            }
            };
        }
        
        if(!req.authorization) {
        	log.info('Missing credentials');
        	return new errors.InvalidCredentialsError('missing credentials');
        }
        if(req.authorization && req.authorization.scheme !== (options.scheme || 'BWS')) {
        	log.info('Invalid authorization scheme');
        	return new errors.InvalidCredentialsError('invalid authorization scheme');
        }
	};
	
	return function parse(req, res, next) {
		
		var error;
		
		error = checkMandatoryHeaders(req);
		if(error) {
			next(error);
			return;
		}
		
		error = checkDateHeader(req);
		if(error) {
			next(error);
			return;
		}

		error = extractAuthInfos(req);
		if(error) {
			next(error);
			return;
		}
		
		next();
    };
	
}