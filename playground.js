"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable-next-line:ordered-imports
var bodyParser = require("body-parser");
var crypto = require("crypto");
var express = require("express");
var morgan = require("morgan");
var _1 = require("./");
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
var app = express();
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/", expressRouter);
// tslint:disable-next-line:no-console
app.listen(8080, function () { return console.log("listening"); });
