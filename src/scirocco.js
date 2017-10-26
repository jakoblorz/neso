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
// tslint:disable-next-line:no-namespace
var Errors;
(function (Errors) {
    Errors.FormatError = { code: 400, status: "Format Error" };
    Errors.UnauthorizedError = { code: 401, status: "Unauthorized Error" };
    Errors.ForbiddenError = { code: 403, status: "Forbidden Error" };
    Errors.NotFoundError = { code: 404, status: "Not Found Error" };
    Errors.ServerError = { code: 500, status: "Server Error" };
})(Errors = exports.Errors || (exports.Errors = {}));
/**
 * check if the given object is a object containing the ErrorType
 * keys with the correct types
 * @param object object to test
 */
exports.isErrorType = function (object) {
    return typeof object === "object" &&
        "status" in object && typeof object.status === "string" &&
        "code" in object && typeof object.code === "number";
};
/**
 * respond to a request by sending json data
 * @param payload object which will be the body (json-encoded)
 * @param res expressjs response object
 * @param status http status code
 */
exports.respond = function (payload, res, status) {
    if (status === void 0) { status = 200; }
    return res.status(status).json(payload);
};
/**
 * call a awaitable callback which might throw errors
 * @param awaitable awaitable callback
 * @param argument arguments to call the callback with
 * @param passPureErrors switch if unrecognized errors should
 * be replaced with a ServerError (-> http error code 500)
 */
exports.evaluateAwaitable = function (awaitable, argument, passPureErrors) { return __awaiter(_this, void 0, void 0, function () {
    var e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, awaitable(argument)];
            case 1: return [2 /*return*/, _a.sent()];
            case 2:
                e_1 = _a.sent();
                // check if the thrown error is of the type ErrorType
                if (exports.isErrorType(e_1)) {
                    // e is of the type ErrorType, immediate return is
                    // possible
                    return [2 /*return*/, e_1];
                }
                // wrap the error into a new object which can be evaluated
                // as of the type ErrorType
                e_1 = { code: Errors.ServerError.code, status: Errors.ServerError.status, error: e_1 };
                // check return switch - return the wrapped error or
                // the ServerError as replacement
                return [2 /*return*/, passPureErrors ? e_1 : Errors.ServerError];
            case 3: return [2 /*return*/];
        }
    });
}); };
/**
 * check if the result is an error type and process it if it is.
 * @param result object returned from the evaluateAwaitable function
 * @param req expressjs request object
 * @param res expressjs response object
 * @param next expressjs next-callback
 * @param invokeNextOnError switch to select behavior when errors occur
 */
exports.processEvaluationResult = function (result, req, res, next, invokeNextOnError) {
    // is the result of type ErrorType and should
    // the next callback be invoked
    if (exports.isErrorType(result) && invokeNextOnError) {
        next(result);
        return null;
    }
    // is the result of type ErrorType and the next
    // callback should not be invoked
    if (exports.isErrorType(result)) {
        exports.respond(result, res, result.code);
        return null;
    }
    // this function returns null if an error occured
    // which was processed or something else (else is
    // of type X) will be returned
    return result;
};
/**
 * prepare (convert) the given object into a sendable response
 * @param obj object to convert
 */
exports.prepareResponseBody = function (obj, successCode) {
    if (successCode === void 0) { successCode = 200; }
    // check if the code (http status code) needs to be set
    if (obj.code === undefined || typeof obj.code !== "number") {
        obj.code = successCode;
    }
    // check if the status needs to be set
    if (obj.status === undefined || typeof obj.status !== "string") {
        obj.status = "Success";
    }
    // return the altered object
    return obj;
};
/**
 * scaffold a new expressjs request handler which is executing the different evaluation stages
 * automatically
 * @param construct callback which compiles the Request object into a RequestType object
 * @param transaction callback which will be executed
 * @param destruct callback which can be set to compile the result into a new object or
 * set custom values on the request object
 * @param invokeNextOnError flag which will change the control flow - instead of immediately
 * responding with and error if one is thrown, invoke the next callback with the error
 * @param passPureErrors flag which will indicate if errors which are not extending the
 * ErrorType should be replaced with a ServerError
 * @param customSuccessCode change the success code which is being sent if the callbacks
 * executed successfully
 * @param isMiddlewareCallback indicate to not respond but call next-callback when execution
 * successfully ends
 */
exports.scaffold = function (construct, transaction, destruct, invokeNextOnError, passPureErrors, customSuccessCode, isMiddlewareCallback) {
    if (destruct === void 0) { destruct = function (source, req, res) { return source; }; }
    if (invokeNextOnError === void 0) { invokeNextOnError = false; }
    if (passPureErrors === void 0) { passPureErrors = false; }
    if (customSuccessCode === void 0) { customSuccessCode = 200; }
    if (isMiddlewareCallback === void 0) { isMiddlewareCallback = false; }
    /**
     * @param awaitable awaitable callback
     * @param argument arguments to call the callback with
     * @see evaluateAwaitable()
     */
    var evaluate = function (awaitable, argument) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, exports.evaluateAwaitable(awaitable, argument, passPureErrors)];
    }); }); };
    // return an expressjs request handler
    return function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
        var _this = this;
        var process, executeStage, source, target, destruction, response, body;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process = function (result) {
                        return exports.processEvaluationResult(result, req, res, next, invokeNextOnError);
                    };
                    executeStage = function (awaitable, argument) { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                _a = process;
                                return [4 /*yield*/, evaluate(awaitable, argument)];
                            case 1: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                        }
                    }); }); };
                    return [4 /*yield*/, executeStage(construct, req)];
                case 1:
                    source = _a.sent();
                    if (source === null) {
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, executeStage(transaction, source)];
                case 2:
                    target = _a.sent();
                    if (target === null) {
                        return [2 /*return*/];
                    }
                    destruction = function (argument) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, destruct(argument, req, res)];
                    }); }); };
                    return [4 /*yield*/, executeStage(destruction, target)];
                case 3:
                    response = _a.sent();
                    if (response === null) {
                        return [2 /*return*/];
                    }
                    // if this is represents a middleware RequestHandler,
                    // do not respond to the client, call next() without any
                    // arguments instead
                    if (isMiddlewareCallback) {
                        next();
                        return [2 /*return*/];
                    }
                    body = exports.prepareResponseBody(response, customSuccessCode);
                    exports.respond(body, res, body.code);
                    return [2 /*return*/];
            }
        });
    }); };
};
/**
 * create a factory function which configures expressjs RequestHandlers
 * @param configuration add your own flavor
 */
exports.config = function (configuration) {
    return function (construct, transaction, destruct, middleware, successCode) {
        if (middleware === void 0) { middleware = false; }
        if (successCode === void 0) { successCode = 200; }
        return exports.scaffold(construct, transaction, destruct, configuration.invokeNextOnError, configuration.passPureErrors, successCode, middleware);
    };
};
/**
 * guard a callback which transforms a SourceType object int a TargetType object
 * @param secure callback to evaluate if the given object is a valid SourceType
 * @param callback callback which is being invoked only if the given object is a valid SourceType
 */
exports.guard = function (secure, callback) {
    // return a async callback which takes the source and calls the callback
    // only if the guard (the secure callback) evaluates the source as valid
    // otherwise throw a FormatError which will be caught if this callback
    // is being hooked into the expressjs stack using the scaffold function
    return function (source) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // check if the source object is a valid SourceType object
            if (!secure(source)) {
                // source object is not valid - throw an FormatError
                throw Errors.FormatError;
            }
            // source object is a valid object - call the callback
            // and return its promise
            return [2 /*return*/, callback(source)];
        });
    }); };
};
// tslint:disable-next-line:max-line-length
var ScaffoldedEventHandler = /** @class */ (function () {
    function ScaffoldedEventHandler(configuration, isMiddleware) {
        if (configuration === void 0) { configuration = { invokeNextOnError: false, passPureErrors: false }; }
        if (isMiddleware === void 0) { isMiddleware = false; }
        this.configuration = configuration;
        this.isMiddleware = isMiddleware;
    }
    ScaffoldedEventHandler.prototype.combine = function (result, req, res) {
        return result;
    };
    /**
     * handler
     */
    ScaffoldedEventHandler.prototype.handler = function () {
        var transaction = exports.guard(this.guard, this.call);
        return exports.scaffold(this.construct, transaction, this.combine, this.isMiddleware);
    };
    return ScaffoldedEventHandler;
}());
exports.ScaffoldedEventHandler = ScaffoldedEventHandler;
