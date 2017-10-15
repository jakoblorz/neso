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
/* error definitions */
exports.FormatError = { code: 400, status: "Format Error" };
exports.UnauthorizedError = { code: 401, status: "Unauthorized Error" };
exports.ForbiddenError = { code: 403, status: "Forbidden Error" };
exports.NotFoundError = { code: 404, status: "Not Found Error" };
exports.ServerError = { code: 500, status: "Server Error" };
/**
 * respond to a http request
 * @param body body object that needs to be serialized
 * @param serializer function to serialize the body type
 * @param mime body's mime type string
 * @param status http status code as number
 * @param res expressjs response object
 */
exports.send = function (body, serializer, mime, status, res) {
    res.setHeader("Content-Type", mime + "; charset=utf-8");
    res.status(status).send(serializer(body));
};
/**
 * create a wrapped and guarded callback
 * @param guard function to validate that the request object is one of
 * type RequestType
 * @param callback function that will be invoked with the request object,
 * can return ResponseType, LowHttpError or both as promise
 * @param mime signal which mime type will be used
 */
exports.module = function (guard, callback, mime) {
    if (mime === void 0) { mime = "application/json"; }
    // return a factory function which will select the correct serializer
    return function (serializers, type, invokeNextOnError) {
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
                            return [2 /*return*/, exports.send(exports.FormatError, JSON.stringify, "application/json", exports.FormatError.code, res)];
                        }
                        response = exports.ServerError;
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
                            return [2 /*return*/, next(response)];
                        }
                        // if an error occured and the response object (which is the error object
                        // in this case), contains the code and status key, the error is expected
                        // the been thrown on purpose, following the LowHttpError Type
                        // (like throw NotFoundError) - encode the error as JSON in this case
                        // and respond with it
                        if (executionThrewError && "code" in response && "status" in response) {
                            return [2 /*return*/, exports.send(response, JSON.stringify, "application/json", response.code, res)];
                        }
                        // if an error occured and was not processed yet, the error must be something
                        // more concerning - respond with an JSON encoded general ServerError (http error code: 500)
                        if (executionThrewError) {
                            return [2 /*return*/, exports.send(exports.ServerError, JSON.stringify, "application/json", exports.ServerError.code, res)];
                        }
                        // no error occured, respond with the response, using the selected serializer,
                        // the correct http status code and the correct mime type
                        return [2 /*return*/, exports.send(response, serializer, mime, type === "create" ? 201 : 200, res)];
                }
            });
        }); };
    };
};
/**
 * wrap the callback factory from the wrap() function into an expressjs callback
 * @param type specify the type of operation that will be executed
 * @param build provide a callback which will loosely collect all necessary data
 * from the express request object required for the operation
 * @param callback operation callback factory
 * @param serializers all loaded serializers that can be used
 * @param invokeNextOnError flag to change call flow - true will invoke the next
 * callback if an error occured instead of responding with the error or a custom
 * server error. The next function will be invoked with the error as argument
 */
exports.express = function (type, build, callback, serializers, invokeNextOnError) {
    if (invokeNextOnError === void 0) { invokeNextOnError = false; }
    // invoke the factory to build the operation callback
    var operation = callback(serializers, type, invokeNextOnError);
    // return an expressjs callback, which build the request object
    // losely and then invokes the operation callback with this req
    // object
    return function (req, res, next) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, operation(build(req), req, res, next)];
            case 1: return [2 /*return*/, _a.sent()];
        }
    }); }); };
};
/**
 * create a alias representation of a single expressjs callback
 * @param type specify the type of operation
 * @param name provide a unique name for this operation
 * @param url specify the unique expressjs url for this operation
 * @param callback expressjs callback
 */
exports.alias = function (type, name, url, callback) {
    return ({ name: name, callback: callback, url: url, type: type });
};
var Router = /** @class */ (function () {
    /**
     * create a new router
     * @param options expressjs router options
     */
    function Router(options, serializers) {
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
         * kv-translation of LowHttpCallbackType to HttpMethod
         */
        this.typeMethodDictionary = {};
        // initialize the expressjs router
        this.router = express_1.Router(options);
        this.serializers = serializers;
        // load all LowHttpCallbackType to HttpMethod translations
        this.typeMethodDictionary.create = "post";
        this.typeMethodDictionary.read = "get";
        this.typeMethodDictionary.update = "put";
        this.typeMethodDictionary.delete = "delete";
        this.typeMethodDictionary.exist = "head";
    }
    /**
     * create<RequestType>
     */
    Router.prototype.create = function (url, name, build, callback) {
        this.hook("create", url, name, build, callback);
    };
    /**
     * read<RequestType>
     */
    Router.prototype.read = function (url, name, build, callback) {
        this.hook("read", url, name, build, callback);
    };
    /**
     * update<RequestType>
     */
    Router.prototype.update = function (url, name, build, callback) {
        this.hook("update", url, name, build, callback);
    };
    /**
     * delete<RequestType>
     */
    Router.prototype.delete = function (url, name, build, callback) {
        this.hook("delete", url, name, build, callback);
    };
    /**
     * exist<RequestType>
     */
    Router.prototype.exist = function (url, name, build, callback) {
        this.hook("exist", url, name, build, callback);
    };
    /**
     * build
     */
    Router.prototype.build = function () {
        for (var _i = 0, _a = this.routes; _i < _a.length; _i++) {
            var route = _a[_i];
            var method = this.typeMethodDictionary[route.type];
            this.router[method](route.url, route.callback);
        }
        return this.router;
    };
    Router.prototype.hook = function (type, url, name, build, callback) {
        var _this = this;
        var isDuplicateNameRoute = this.routes
            .filter(function (r) { return r.name === name; }).length > 0;
        if (isDuplicateNameRoute) {
            throw new Error("duplicate name found: " + name + " was already loaded");
        }
        var isDuplicateUrlTypeRoute = this.routes
            .filter(function (r) { return r.url === url && r.type === type; }).length > 0;
        if (isDuplicateUrlTypeRoute) {
            throw new Error("duplicate url found: combination " + url + " and '" + type + "' was already loaded");
        }
        var operation = callback(this.serializers, type, this.invokeNextOnError);
        var expressCallback = function (req, res, next) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, operation(build(req), req, res, next)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        }); }); };
        this.routes.push(({ callback: expressCallback, name: name, type: type, url: url }));
    };
    return Router;
}());
exports.Router = Router;
