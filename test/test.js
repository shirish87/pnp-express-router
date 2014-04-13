
var RouteLoader = require('../index')
  , config = require('./config')
  , path = require('path')


var config = {
    config: true
};

var app = function (done) {
    return {
        get: function (path, callback) {
            if (path === '/') {
                this.get = function () {};
                done();
            }
        }
    };
};

var plugins = [{
    path: path.resolve('./test/routes')
}];



describe("Functionality", function () {
    // TODO: More tests

    it("Loads routes", function (done) {
        var routeOptions = {
            plugins: plugins
        };

        var routeLoader = new RouteLoader(config, app(done), routeOptions);
        routeLoader.init();
        routeLoader.debug();
    });


    it("Loads routes (lazy)", function (done) {

        var routeOptions = {
            plugins: []
        };

        var routeLoader = new RouteLoader(config, app(done), routeOptions);
        routeLoader.addRoute(plugins[0]);

        routeLoader.init();
        routeLoader.debug();
    });

});