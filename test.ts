import { Request } from "express";
import { ApplicationRouter, ScaffoldedRequestHandler } from "./";

class SimpleRequestHandler extends ScaffoldedRequestHandler<Request, { name: string }, { account: { id: string }}> {
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

const app = new ApplicationRouter();
app.get("/", new SimpleRequestHandler().obtainHandler())
    .name("get-account-from-name")
    .description("gets a account from the database by a given name");

export const application = app;
