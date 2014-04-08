
var RouteLoader = require('../index')
  , config = require('./config')
  , path = require('path')


describe("Functionality", function () {
    // TODO: More tests

    it("Loads routes", function (done) {
        var config = { config: true };

        var app = {
            get: function (path, callback) {
                if (path === '/') {
                    app.get = function () {};
                    done();
                }
            }
        };

        var plugins = [{
            path: path.resolve('./test/routes')
        }];

        var routeOptions = {
            plugins: plugins
        };

        var routeLoader = new RouteLoader(config, app, routeOptions);
        routeLoader.init();
        routeLoader.debug();
    });

});