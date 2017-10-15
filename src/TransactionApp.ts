import { NextFunction, Request, Response, Router as ExpressRouter } from "express";
import * as express from "express";

import { TransactionRouter } from "./TransactionRouter";

export class TransactionApp {

    /**
     * list of loaded routers
     */
    private routers: TransactionRouter[] = [];
}
