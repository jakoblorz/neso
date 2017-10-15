"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto = require("crypto");
var _1 = require("./");
var neso = require("./");
var hash = function (payload) {
    var salt = crypto.randomBytes(Math.ceil(64 / 2)).toString("hex").slice(0, 64);
    return { salt: salt, hash: crypto.createHmac("sha512", salt).update(payload).digest("hex") };
};
var PasswordHashFactory = _1.module(function (data) {
    return "username" in data && data.username && "password" in data && data.password;
}, function (object) { return hash(object.password); });
var router = new _1.Router(undefined, [{ mime: "application/json", serializer: JSON.stringify }]);
router.create("/", "", function (req) {
    return ({ password: req.body.password, username: req.query.user });
}, PasswordHashFactory);
var expressRouter = router.build();
var app = new neso.default();
app.load("/", router);
// tslint:disable-next-line:no-console
app.listen(8080, function () { return console.log("listening"); });
