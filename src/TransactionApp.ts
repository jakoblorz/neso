import * as bodyParser from "body-parser";
import { NextFunction, Request, Response, Router as ExpressRouter } from "express";
import * as express from "express";
import * as morgan from "morgan";

import { TransactionRouter } from "./TransactionRouter";
import { IRoute } from "./types";

export class TransactionApp {

    /**
     * list of loaded routers
     */
    private routers: Array<IRoute<TransactionRouter>> = [];

    /**
     * load
     */
    public load(url: string, router: TransactionRouter) {
        this.routers.push({ url, router });
    }

    public listen(port: number, onListening: () => any) {
        const app = express();

        app.use(morgan("dev"));
        app.use(bodyParser.urlencoded({ extended: false }));
        app.use(bodyParser.json());

        for (const route of this.routers) {
            app.use(route.url, route.router.build());
        }

        app.listen(port, onListening);
    }
}
