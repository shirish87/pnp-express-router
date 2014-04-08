
var Plugger = require('plugger')
  , methods = require('methods')
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
var DEF_ROUTE_OPTIONS = {
    types: [
        'params'
      , 'external'
      , 'validate'
      , 'validated'
      , 'check'
      , 'checked'
      , 'authenticate'
      , 'authenticated'
    ]
  , middlewares: {

    }
};


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
 * @param callback            feedback on plugin invocation
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
    options.routeOptions = options.routeOptions || DEF_ROUTE_OPTIONS;

    this._routeTypes = options.routeOptions.types || DEF_ROUTE_OPTIONS.types;
    this._middlewares = options.routeOptions.middlewares || DEF_ROUTE_OPTIONS.middlewares;


    var self = this
      , routeTypes
      , plugger
      , pluginOpts
      , priority
      ;

    this._options = options;
    this._config = config;
    this._app = app;
    this._routes = [];


    if (!this._routeTypes.length || !this._config || !this._app) {
        throw new Error('Invalid arguments');
    }

    routeTypes = this._routeTypes;

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
                    plugin[routeType].apply(plugin, self._buildPluginArgs(routeType, plugin, slice.call(arguments)));
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

    this._routeTypes.forEach(function (routeType) {

        // pass on arguments, if any, to every 'routeType' hook
        var fnArgs = (args.length > 0)
            ? args.slice(0)
            : [];

        fnArgs.unshift(routeType);
        self._dispatchEvent.apply(self, fnArgs);
    });
};


/**
 * Returns registered routes
 * @returns {Array}
 */
RouteLoader.prototype.getRoutes = function () {
    return this._routes || [];
};



/**
 * Prints all registered routes
 */
RouteLoader.prototype.debug = function () {
    console.log('\n---------------');

    this._routes.forEach(function (route) {
        console.log('[ROUTE] ' + route.method + ' '  + route.path + ' | ' + route.plugin + '.' + route.routeType);
    });

    console.log('---------------\n');
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
      , plugger = this.plugger
      ;

    debug('invoking ' + args[0]);
    plugger.invoke.apply(plugger, args);
    return true;
};


RouteLoader.prototype._buildPluginArgs = function (routeType, plugin, pluginArgs) {

    var routes = this._routes
      , middleware = this._middlewares[routeType] || false
      , app = this._app
      , config = this._config
      , id = this._options.protocol.id
      , routerApp = {}
      ;


    methods.forEach(function (method) {
        routerApp[method] = function () {
            if (!arguments.length) {
                return;
            }


            var args = slice.call(arguments)
              , path
              ;

            if (typeof middleware === 'function') {
                // attach middleware
                path = args.shift();
                args.unshift(middleware);
                args.unshift(path);

                debug('attached middleware for path: ' + path);
            }

            // call actual app
            app[method].apply(app, args);

            // record registered routes
            routes.push({
                plugin: plugin[id]
              , routeType: routeType
              , method: method.toUpperCase()
              , path: args[0]
            });
        };
    });


    routerApp = (Object.keys(routerApp).length > 0)
        ? routerApp
        : app;

    pluginArgs.unshift(routerApp);
    pluginArgs.unshift(config);

    return pluginArgs;
};



module.exports = exports = RouteLoader;