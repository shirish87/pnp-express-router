
var Plugger = require('plugger')
  , debug = require('debug')('pnp-express-router')
  , path = require('path')
  ;


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



/**
 *
 * @param config {Object}     node-convict configuration
 * @param app {Object}        express app
 * @param options {Object}    options including 'isSubApp' and 'plugins'
 * @returns {RouteLoader}
 * @constructor
 */
function RouteLoader(config, app, options, callback) {
    if (!(this instanceof RouteLoader)) {
        return new RouteLoader(config, app, options);
    }

    options = options || {};
    options.plugins = options.plugins || [];
    options.protocol = options.protocol || DEF_PROTOCOL;


    var routeTypes
      , plugger
      , pluginOpts
      , priority
      ;

    this.options = options;
    this.config = config;
    this.app = app;

    routeTypes = this.routeTypes = options.routeTypes || DEF_ROUTE_TYPES;

    if (!routeTypes.length || !this.config || !this.app) {
        throw new Error('Invalid arguments');
    }

    pluginOpts = {
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

    plugger = new Plugger(options.plugins, pluginOpts, function (err) {
        if (typeof callback === 'function') {
            callback(err);
        }

        debug('complete', err || true);
    });


    priority = 1;
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
    plugger.seal();

    this.plugger = plugger;

    return this;
}


/**
 * Initializes detected routes and invokes hooks
 */
RouteLoader.prototype.init = function () {
    var args = slice.call(arguments)
      , self = this
      ;

    this.routeTypes.forEach(function (routeType) {
        var fnArgs = (args.length > 0)
            ? args.slice(0)
            : [];

        fnArgs.unshift(routeType);
        self._dispatchEvent.apply(self, fnArgs);
    });
};



/**
 * Invoke registered hooks for the specified event
 * @returns {boolean}
 * @private
 */
RouteLoader.prototype._dispatchEvent = function () {
    if (arguments.length === 0) {
        debug('_dispatchEvent: invalid args');
        return false;
    }

    var args = slice.call(arguments) || []
      , event = args.shift()
      , plugger = this.plugger
      ;

    args.unshift(this.app);
    args.unshift(this.config);
    args.unshift(event);

    debug('invoking ' + event);
    plugger.invoke.apply(plugger, args);
    return true;
};



module.exports = exports = RouteLoader;