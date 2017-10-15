"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bodyParser = require("body-parser");
var express = require("express");
var morgan = require("morgan");
var TransactionApp = /** @class */ (function () {
    function TransactionApp() {
        /**
         * list of loaded routers
         */
        this.routers = [];
    }
    /**
     * load
     */
    TransactionApp.prototype.load = function (url, router) {
        this.routers.push({ url: url, router: router });
    };
    TransactionApp.prototype.listen = function (port, onListening) {
        var app = express();
        app.use(morgan("dev"));
        app.use(bodyParser.urlencoded({ extended: false }));
        app.use(bodyParser.json());
        for (var _i = 0, _a = this.routers; _i < _a.length; _i++) {
            var route = _a[_i];
            app.use(route.url, route.router.build());
        }
        app.listen(port, onListening);
    };
    return TransactionApp;
}());
exports.TransactionApp = TransactionApp;
