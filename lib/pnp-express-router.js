
var Plugger = require('plugger')
  , debug = require('debug')('pnp-express-router')
  , path = require('path')


/**
 * Cache
 */
var slice = Array.prototype.slice;


/**
 * Methods that exist in router files
 */
var DEF_ROUTE_TYPES = [
    'public'
  , 'validate'
  , 'protected'
  , 'authenticated'
  , 'private'
];


/**
 * Protocol to be followed by all routes
 */
var DEF_PROTOCOL = {
    main: false
  , id: 'name'
  , orderBy: 'priority'
  , contract: {
        name: 'string'
      , priority: 'number'
    }
};


function mirrorHash(arr) {
    if (!Array.isArray(arr)) {
        return false;
    }

    if (arr.length === 0) {
        return {};
    }

    var obj = {};

    arr.forEach(function (item) {
        if (typeof item === 'string') {
            obj[item] = item;
        }
    });

    return obj;
}



/**
 *
 * @param config {Object}     node-convict configuration
 * @param app {Object}        express app
 * @param options {Object}    options including 'isSubApp' and 'plugins'
 * @returns {RouteLoader}
 * @constructor
 */
function RouteLoader(config, app, options) {
    if (!(this instanceof RouteLoader)) {
        return new RouteLoader(config, app, options);
    }

    options = options || {};
    options.plugins = options.plugins || [];
    options.protocol = options.protocol || DEF_PROTOCOL;

    this.options = options;
    this.config = config;
    this.app = app;

    var routeTypes = this.routeTypes = options.routeTypes || DEF_ROUTE_TYPES;

    if (!routeTypes.length || !this.config || !this.app) {
        throw new Error('Invalid arguments');
    }

    var pluginOpts = {
        protocol: options.protocol
      , filter: function (plugin) {
            for (var i = 0, l = routeTypes.length; i < l; i++) {
                if (typeof plugin[routeTypes[i]] === 'function') {
                    debug('accepted route: ' + plugin[options.protocol.id]);
                    return true;
                }
            }

            debug('ignored route: ' + plugin[options.protocol.id]);
            return false;
        }
    };

    var plugger = new Plugger(options.plugins, pluginOpts, function (err) {
        if (err) {
            // let it crash
            throw err;
        }
    });

    var priority = 1;

    plugger.forEach(function (plugin) {
        routeTypes.forEach(function (routeType) {
            if (typeof plugin[routeType] === 'function') {
                plugger.hook(routeType, { priority: priority }, function () {
                    plugin[routeType].apply(plugin, slice.call(arguments));
                });

                priority++;
            }
        });
    });

    // let plugins register their hooks
    plugger.init();

    this.hook = plugger.hook.bind(plugger);
    this.plugger = plugger;
}


/**
 * Initializes detected routes and invokes hooks
 */
RouteLoader.prototype.init = function () {
    var args = slice.call(arguments);

    var self = this;
    this.routeTypes.forEach(function (routeType) {
        var fnArgs;
        if (args.length > 0) {
            fnArgs = args.slice(0);
        } else {
            fnArgs = [];
        }

        fnArgs.unshift(routeType);
        self._dispatchEvent.apply(self, fnArgs);
    });
}



/**
 * Invoke registered hooks for the specified event
 * @returns {boolean}
 * @private
 */
RouteLoader.prototype._dispatchEvent = function () {
    var args = slice.call(arguments);
    if (args.length === 0) {
        debug('_dispatchEvent: invalid args');
        return false;
    }

    var event = args.shift();
    args.unshift(this.app);
    args.unshift(this.config);
    args.unshift(event);

    var plugger = this.plugger;
    debug('invoking ' + event);
    plugger.invoke.apply(plugger, args);
    return true;
}



module.exports = exports = RouteLoader;