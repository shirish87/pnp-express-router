var debug = require('debug')('plugin2')

module.exports.name = 'plugin2';

module.exports.priority = 1;


module.exports.public = function (config, app) {
    debug('invoked: plugin2');

    app.get('/', function (req, res, next) {
        res.end('Hi');
    });
}