/// <reference types="express" />
import * as express from "express";
import { IWrappedHandler } from "../src/scirocco";
/**
 * connect all handlers to a expressjs router instance
 * @param handlers list of all imported handlers
 * @param router router object which will recieve all handlers
 */
export declare const buildExpressJSStackFromHandlerList: <X extends express.Router>(handlers: IWrappedHandler[], router: X) => X;
