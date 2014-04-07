var debug = require('debug')('plugin1')

module.exports.name = 'plugin1';

module.exports.priority = 2;


module.exports.public = function (config, app) {
    debug('invoked: plugin1');

    app.get('/', function (req, res, next) {
        res.end('Hi');
    });
}