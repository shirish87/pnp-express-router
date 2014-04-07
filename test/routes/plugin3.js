var debug = require('debug')('plugin3')

module.exports.name = 'plugin3';

module.exports.priority = 1;


module.exports.authenticated = function (config, app) {
    debug('invoked: plugin3');

    app.get('/', function (req, res, next) {
        res.end('Hi');
    });
}