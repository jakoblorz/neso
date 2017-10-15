"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * respond to a http request
 * @param body body object that needs to be serialized
 * @param serializer function to serialize the body type
 * @param mime body's mime type string
 * @param status http status code as number
 * @param res expressjs response object
 */
exports.send = function (body, serializer, 
    // tslint:disable-next-line:align
    mime, status, res) {
    if (res.finished !== true) {
        res.setHeader("Content-Type", mime + "; charset=utf-8");
        res.status(status).end(serializer(body));
    }
};
