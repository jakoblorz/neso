import * as assert from "assert";
import * as body from "body-parser";
import * as express from "express";
import * as mocha from "mocha";
import * as http from "supertest";
import { Errors } from "./errors";

import { createExecuteTryCatchEvaluation } from "./scaffold";
import { prepareSuccessObject } from "./scaffold";
import { scaffold } from "./scaffold";

const error = <X>(e: X) =>
    (source: {}): {} => { throw e; };

const success = <X>(e: X) =>
    (source: {}): X => e;

const createApp = (callbacks: Array<{ cb: express.RequestHandler, url: string }>) => {

    const app = express();
    app.use(body.urlencoded({ extended: false }));
    app.use(body.json());

    for (const callback of callbacks) {
        app.get(callback.url, callback.cb);
    }

    return app;
};
