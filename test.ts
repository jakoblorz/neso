import { Request } from "express";
import * as morgan from "morgan";
import { ApplicationRouter, RequestHandler, scirocco } from "./";

class SimpleRequestHandler extends RequestHandler<Request, { name: string }, { account: { id: string }}> {
    public extract(request: Request): { name: string; } {
        return ({ name: request.query.name });
    }
    public guard(source: any): source is { name: string; } {
        return typeof source === "object" &&
            "name" in source && typeof source.name === "string";
    }
    public callback(source: { name: string; }): { account: { id: string; }; } {
        return ({ account: { id: source.name }});
    }

}

const app = new scirocco();

app.use("/", morgan("dev"))
    .name("morgan:logger")
    .description("logs all incomming requests");

app.get("/", new SimpleRequestHandler().obtainHandler())
    .name("get-account-from-name")
    .description("gets a account from the database by a given name");

export const application = app;
