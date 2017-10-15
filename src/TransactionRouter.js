"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var error_1 = require("./error");
var http_1 = require("./http");
/**
 * create a wrapped and guarded callback
 * @param guard function to validate that the request object is one of
 * type RequestType
 * @param callback function that will be invoked with the request object,
 * can return ResponseType, NesoError or both as promise
 * @param mime signal which mime type will be used
 */
exports.module = function (guard, callback, mime) {
    if (mime === void 0) { mime = "application/json"; }
    // return a factory function which will select the correct serializer
    return function (serializers, method, type, invokeNextOnError) {
        if (invokeNextOnError === void 0) { invokeNextOnError = false; }
        // select the correct serializer for the mime string, default is
        // JSON.stringify()
        var serializer = serializers
            .filter(function (s) { return s.mime === mime; })[0].serializer || JSON.stringify;
        // result of the factory function is a expressjs styled handler
        return function (object, req, res, next) { return __awaiter(_this, void 0, void 0, function () {
            var response, executionThrewError, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // check if the recieved request object contains the required keys
                        if (!guard(object)) {
                            // request does not contain the necessary keys, respond with a JSON-encoded
                            // Format Error
                            http_1.send(error_1.FormatError, JSON.stringify, "application/json", error_1.FormatError.code, res);
                            return [2 /*return*/, null];
                        }
                        response = error_1.FormatError;
                        executionThrewError = false;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, callback(object)];
                    case 2:
                        // invoke the callback and wait for the result
                        response = _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        // catch possible errors during callback execution
                        // error will be set as the response while also setting
                        // the error flag to true
                        executionThrewError = true;
                        response = e_1;
                        return [3 /*break*/, 4];
                    case 4:
                        // if an error occured and next-callback should be invoked,
                        // do it right here
                        if (executionThrewError && invokeNextOnError) {
                            next(response);
                            return [2 /*return*/, null];
                        }
                        // if an error occured and the response object (which is the error object
                        // in this case), contains the code and status key, the error is expected
                        // the been thrown on purpose, following the NesoError Type
                        // (like throw NotFoundError) - encode the error as JSON in this case
                        // and respond with it
                        if (executionThrewError && "code" in response && "status" in response) {
                            http_1.send(response, JSON.stringify, "application/json", response.code, res);
                            return [2 /*return*/, null];
                        }
                        // if an error occured and was not processed yet, the error must be something
                        // more concerning - respond with an JSON encoded general ServerError (http error code: 500)
                        if (executionThrewError) {
                            http_1.send(error_1.ServerError, JSON.stringify, "application/json", error_1.ServerError.code, res);
                            return [2 /*return*/, null];
                        }
                        // no error occured
                        // if the callback is one of an endpoint respond with the response
                        // immediately
                        if (type === "endpoint") {
                            // respond with the response, using the selected serializer,
                            // the correct http status code and the correct mime type
                            http_1.send(response, serializer, mime, method === "create" ? 201 : 200, res);
                            return [2 /*return*/, null];
                        }
                        // kind is middleware - the callbacks result needs to be returned
                        return [2 /*return*/, response];
                }
            });
        }); };
    };
};
var TransactionRouter = /** @class */ (function () {
    /**
     * create a new router
     * @param options expressjs router options
     */
    function TransactionRouter(options, serializers) {
        /**
         * flag to change execution flow - true will invoke the next
         * callback if an error occured instead of responding with the error or a custom
         * server error. The next function will be invoked with the error as argument
         */
        this.invokeNextOnError = false;
        /**
         * list of all routes in this router
         */
        this.routes = [];
        /**
         * kv-translation of NesoCallbackType to HttpMethod
         */
        this.typeMethodDictionary = {};
        // initialize the expressjs router
        this.router = express_1.Router(options);
        this.serializers = serializers;
        // load all NesoCallbackType to HttpMethod translations
        this.typeMethodDictionary.create = "post";
        this.typeMethodDictionary.read = "get";
        this.typeMethodDictionary.update = "put";
        this.typeMethodDictionary.delete = "delete";
        this.typeMethodDictionary.exist = "head";
        this.typeMethodDictionary.all = "all";
    }
    /**
     * create<RequestType, ResponseType>
     */
    TransactionRouter.prototype.create = function (url, name, construct, callback) {
        this.route("create", "endpoint", url, name, construct, callback);
    };
    /**
     * read<RequestType, ResponseType>
     */
    TransactionRouter.prototype.read = function (url, name, construct, callback) {
        this.route("read", "endpoint", url, name, construct, callback);
    };
    /**
     * update<RequestType, ResponseType>
     */
    TransactionRouter.prototype.update = function (url, name, construct, callback) {
        this.route("update", "endpoint", url, name, construct, callback);
    };
    /**
     * delete<RequestType, ResponseType>
     */
    TransactionRouter.prototype.delete = function (url, name, construct, callback) {
        this.route("delete", "endpoint", url, name, construct, callback);
    };
    /**
     * build
     */
    TransactionRouter.prototype.build = function () {
        for (var _i = 0, _a = this.routes; _i < _a.length; _i++) {
            var route = _a[_i];
            var method = this.typeMethodDictionary[route.method];
            this.router[method](route.url, route.callback);
        }
        return this.router;
    };
    /**
     * use<RequestType, ResponseType>
     */
    TransactionRouter.prototype.use = function (url, method, construct, callback, destruct) {
        this.route(method, "middleware", url, "", construct, callback, destruct);
    };
    TransactionRouter.prototype.route = function (method, type, url, name, construct, callback, destruct) {
        var _this = this;
        // endpoint routes have some constraints that need to be met
        if (type === "endpoint") {
            // indicate if there is at least one other non-middleware
            // route registration with the same name which would
            // violate the unique name constraint
            var isDuplicateNameRoute = this.routes
                .filter(function (r) { return r.type === "endpoint"; })
                .filter(function (r) { return r.name === name; }).length > 0;
            // throw an error if there is a unique name
            // constraint violation
            if (isDuplicateNameRoute) {
                throw new Error("duplicate name found: " + name + " was already loaded");
            }
            // indicate if there is at least one other non-middleware
            // route registration with the same url and type, which
            // would violate the unique url-type association constraint
            var isDuplicateUrlMethodRoute = this.routes
                .filter(function (r) { return r.type === "endpoint"; })
                .filter(function (r) { return r.url === url && r.method === method; }).length > 0;
            // throw an error if there is a unique url-type
            // association violation
            if (isDuplicateUrlMethodRoute) {
                throw new Error("duplicate url found: " + url + " and '" + method + "' was already loaded");
            }
        }
        // invoke the factory callback (callback) with the type, the serializers
        // and the next-behavior flag invokeNextOnError
        var transaction = callback(this.serializers, method, type, this.invokeNextOnError);
        // build the async expressjs callback from the newly generated
        // transaction function
        var express = function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
            var request, e_2, result, e_3, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        request = {};
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, construct(req)];
                    case 2:
                        request = _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _a.sent();
                        // block requests that cannot be constructed
                        http_1.send(error_1.FormatError, JSON.stringify, "application/json", error_1.FormatError.code, res);
                        return [2 /*return*/, null];
                    case 4:
                        result = {};
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, transaction(request, req, res, next)];
                    case 6:
                        result = _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_3 = _a.sent();
                        // it seems like the operation function did not catch all exceptions -
                        // provide extract catch with a general ServerError response (http error code 500)
                        http_1.send(error_1.ServerError, JSON.stringify, "application/json", error_1.ServerError.code, res);
                        return [2 /*return*/, null];
                    case 8:
                        if (!(destruct && result !== null && result !== undefined)) return [3 /*break*/, 12];
                        _a.label = 9;
                    case 9:
                        _a.trys.push([9, 11, , 12]);
                        return [4 /*yield*/, destruct(result, req)];
                    case 10:
                        _a.sent();
                        return [3 /*break*/, 12];
                    case 11:
                        e_4 = _a.sent();
                        return [3 /*break*/, 12];
                    case 12:
                        if (type === "middleware") {
                            next();
                        }
                        return [2 /*return*/];
                }
            });
        }); };
        // there is no constraint violation, the callbacks were all generated
        // successfully - push the route alias into the routes list
        this.routes.push({ callback: express, method: method, name: name, type: type, url: url });
    };
    return TransactionRouter;
}());
exports.TransactionRouter = TransactionRouter;
