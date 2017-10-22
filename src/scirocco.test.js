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
var assert = require("assert");
var sci = require("./scirocco");
describe("isErrorType()", function () {
    it("should correctly identify as error", function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _b = (_a = assert).equal;
                    return [4 /*yield*/, sci.isErrorType({ code: 200, status: "Success" })];
                case 1:
                    _b.apply(_a, [_c.sent(), true]);
                    return [2 /*return*/];
            }
        });
    }); });
    it("should correctly identify not as an error", function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _b = (_a = assert).equal;
                    return [4 /*yield*/, sci.isErrorType("{ code: 200, status: 'Success' }")];
                case 1:
                    _b.apply(_a, [_g.sent(), false]);
                    _d = (_c = assert).equal;
                    return [4 /*yield*/, sci.isErrorType(200)];
                case 2:
                    _d.apply(_c, [_g.sent(), false]);
                    _f = (_e = assert).equal;
                    return [4 /*yield*/, sci.isErrorType({ code: "Success", status: 200 })];
                case 3:
                    _f.apply(_e, [_g.sent(), false]);
                    return [2 /*return*/];
            }
        });
    }); });
});
describe("guard()", function () {
    it("should build callback without errors", function () { return __awaiter(_this, void 0, void 0, function () {
        var callback;
        return __generator(this, function (_a) {
            callback = sci.guard(function (source) { return true; }, function (source) { return ({}); });
            return [2 /*return*/];
        });
    }); });
    it("should throw error when error is thrown in guard", function () { return __awaiter(_this, void 0, void 0, function () {
        var callback, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    callback = sci.guard(function (source) {
                        throw sci.Errors.FormatError;
                    }, function (source) { return ({}); });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, callback({})];
                case 2:
                    _a.sent();
                    throw new Error("guard executed successfully");
                case 3:
                    e_1 = _a.sent();
                    if (sci.isErrorType(e_1)) {
                        return [2 /*return*/];
                    }
                    throw new Error("not ErrorType error caught");
                case 4: return [2 /*return*/];
            }
        });
    }); });
    it("should throw FormatError when guard evaluates to false", function () { return __awaiter(_this, void 0, void 0, function () {
        var callback, e_2, isValid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    callback = sci.guard(function (source) { return false; }, function (source) { return ({}); });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, callback({})];
                case 2:
                    _a.sent();
                    throw new Error("callback is being called even if the guard evaluates to false");
                case 3:
                    e_2 = _a.sent();
                    isValid = sci.isErrorType(e_2) &&
                        e_2.code === sci.Errors.FormatError.code &&
                        e_2.status === sci.Errors.FormatError.status;
                    if (isValid) {
                        return [2 /*return*/];
                    }
                    throw new Error("not ErrorType / not FormatError caught");
                case 4: return [2 /*return*/];
            }
        });
    }); });
    it("should throw error when error is thrown in callback", function () { return __awaiter(_this, void 0, void 0, function () {
        var callback, e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    callback = sci.guard(function (source) { return true; }, function (source) { throw sci.Errors.FormatError; });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, callback({})];
                case 2:
                    _a.sent();
                    throw new Error("callback executed successfully");
                case 3:
                    e_3 = _a.sent();
                    if (sci.isErrorType(e_3)) {
                        return [2 /*return*/];
                    }
                    throw new Error("not ErrorType error caught");
                case 4: return [2 /*return*/];
            }
        });
    }); });
    it("should return result if no errors occured", function () { return __awaiter(_this, void 0, void 0, function () {
        var callback, result, isValid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    callback = sci.guard(function (source) { return true; }, function (source) { return ({ success: true }); });
                    return [4 /*yield*/, callback({})];
                case 1:
                    result = _a.sent();
                    isValid = typeof result === "object" &&
                        "success" in result &&
                        result.success === true;
                    assert.equal(isValid, true);
                    return [2 /*return*/];
            }
        });
    }); });
});
