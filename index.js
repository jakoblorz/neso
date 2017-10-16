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
/* error definitions */
exports.FormatError = { code: 400, status: "Format Error" };
exports.UnauthorizedError = { code: 401, status: "Unauthorized Error" };
exports.ForbiddenError = { code: 403, status: "Forbidden Error" };
exports.NotFoundError = { code: 404, status: "Not Found Error" };
exports.ServerError = { code: 500, status: "Server Error" };
var respond = function (payload, res, status) {
    if (status === void 0) { status = 200; }
    return res.status(status).json(payload);
};
exports.secure = function (guard, callback) {
    return function (source) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!guard(source)) {
                throw exports.FormatError;
            }
            return [2 /*return*/, callback(source)];
        });
    }); };
};
/**
 * scaffold a new expressjs request handler which is executing the different evaluation stages
 * automatically
 * @param construct callback which compiles the Request object into a RequestType object
 * @param callback callback which will be executed
 * @param destruct callback which can be set to compile the result into a new object or
 * set custom values on the request object
 * @param invokeNextOnError flag which will change the control flow - instead of immediately
 * responding with and error if one is thrown, invoke the next callback with the error
 * @param passPureErrors flag which will indicate if errors which are not extending the
 * ErrorType should be replaced with a ServerError
 * @param customSuccessCode change the success code which is being sent if the callbacks
 * executed successfully
 */
exports.scaffold = function (construct, callback, destruct, invokeNextOnError, passPureErrors, customSuccessCode) {
    if (invokeNextOnError === void 0) { invokeNextOnError = false; }
    if (passPureErrors === void 0) { passPureErrors = false; }
    if (customSuccessCode === void 0) { customSuccessCode = 200; }
    // return an expressjs request handler
    return function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
        var _this = this;
        var isErrorType, executeTryCatchEvaluation, prepareSuccessObject, constructResult, callbackResult, response, destruction, responseBody;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    isErrorType = function (test) {
                        return "status" in test && typeof test.status === "string" &&
                            "code" in test && typeof test.code === "number";
                    };
                    executeTryCatchEvaluation = function (awaitable, arg) { return __awaiter(_this, void 0, void 0, function () {
                        var data, e_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    data = {};
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, awaitable(arg)];
                                case 2:
                                    data = _a.sent();
                                    return [3 /*break*/, 4];
                                case 3:
                                    e_1 = _a.sent();
                                    // filter the error by checking if it extends the
                                    // ErrorType
                                    // if the error is an error extending the ErrorType
                                    // and next callback should be invoked
                                    if (isErrorType(e_1) && invokeNextOnError) {
                                        next(e_1);
                                        return [2 /*return*/, null];
                                    }
                                    // if the error is an error extending the ErrorType
                                    if (isErrorType(e_1)) {
                                        respond(e_1, res, e_1.code);
                                        return [2 /*return*/, null];
                                    }
                                    // error e is not extending the ErrorType
                                    e_1 = { code: exports.ServerError.code, status: exports.ServerError.status, error: e_1 };
                                    // if the error is not an error extending the ErrorType
                                    // yet the next callback should be invoked
                                    if (invokeNextOnError) {
                                        // depending on the setting passPureErrors,
                                        // replace the error with a ServerError or use the pure on
                                        next(passPureErrors ? e_1 : exports.ServerError);
                                        return [2 /*return*/, null];
                                    }
                                    // if the error is not an error extending the ErrorType
                                    // and the next callback should not be invoked
                                    respond(passPureErrors ? e_1 : exports.ServerError, res, exports.ServerError.code);
                                    return [2 /*return*/, null];
                                case 4:
                                    // if the result (data) is extending the Error Type, an error
                                    // occured and the control-flow needs to be altered:
                                    // here the next callback should be called
                                    if (isErrorType(data) && invokeNextOnError) {
                                        next(data);
                                        return [2 /*return*/, null];
                                    }
                                    // here the error should be immediately responded
                                    if (isErrorType(data)) {
                                        respond(data, res, data.code);
                                        return [2 /*return*/, null];
                                    }
                                    // return the data -> return type is Y if the
                                    // async callback did not return an error in any way
                                    // return type is null if an error was produced and processed
                                    return [2 /*return*/, data];
                            }
                        });
                    }); };
                    prepareSuccessObject = function (obj) {
                        // check if the code (http status code) needs to be set
                        if (obj.code === undefined || typeof obj.code !== "number") {
                            obj.code = customSuccessCode;
                        }
                        // check if the status needs to be set
                        if (obj.status === undefined || typeof obj.status !== "string") {
                            obj.status = "Success";
                        }
                        // return the altered object
                        return obj;
                    };
                    return [4 /*yield*/, executeTryCatchEvaluation(construct, req)];
                case 1:
                    constructResult = _a.sent();
                    if (constructResult === null) {
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, executeTryCatchEvaluation(callback, constructResult)];
                case 2:
                    callbackResult = _a.sent();
                    if (callbackResult === null) {
                        return [2 /*return*/, null];
                    }
                    response = callbackResult;
                    if (!(destruct !== undefined)) return [3 /*break*/, 4];
                    destruction = function (arg) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, destruct(arg, req, res)];
                            case 1: return [2 /*return*/, _a.sent()];
                        }
                    }); }); };
                    return [4 /*yield*/, executeTryCatchEvaluation(destruction, callbackResult)];
                case 3:
                    // change the response object in the destruction phase
                    response = _a.sent();
                    // the response can now be null - if the response channel
                    // closed already (req.finished) then a error occured
                    // -> stop the execution
                    if (response === null && res.finished) {
                        return [2 /*return*/, null];
                    }
                    // the response channel was not closed yet thus the response
                    // should be the callbackResult
                    if (response === null) {
                        response = callbackResult;
                    }
                    _a.label = 4;
                case 4:
                    responseBody = prepareSuccessObject(response);
                    respond(responseBody, res, responseBody.code);
                    // execution flow ends here - unneeded
                    return [2 /*return*/, null];
            }
        });
    }); };
};
