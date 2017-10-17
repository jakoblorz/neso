import * as express from "express";
import { config, guard } from "./";

const scaffold = config({ invokeNextOnError: false, passPureErrors: false });

const app = express();
app.get("/", scaffold<{ email: string }, { taken: boolean }, {}>(
    (request) => ({ email: request.query.email }),
    guard<{ email: string }, { taken: boolean}>(
    (object): object is { email: string } =>
        typeof object === "object" && "email" in object && typeof object.email === "string",
    (source) => ({ taken: source.email === "jakob@lorz.org" }))));

// tslint:disable-next-line:no-console
app.listen(8080, () => console.log("listening"));
