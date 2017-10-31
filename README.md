# scirocco
[![Build Status](https://travis-ci.org/jakoblorz/scirocco.svg?branch=master)](https://travis-ci.org/jakoblorz/scirocco)
## What is scirocco?
scirocco is a (*new?*) turn on building function-based backend services:
Each function will be split into different phases:
1. **Data-Extraction** (method name: **extract**): The required Data for the callback
is extracted from the request.
2. **Format-Validation** (method name: **guard**): The extracted Data will be validated
if format constraints are met.
3. **Execution** (method name: **callback**): The callback will be called with the extracted Data.

## Architecture
The current version is based on [**expressjs**](https://github.com/expressjs/express) thus **all
middleware is compatible with scirocco's own router**. In fact, most of the routing-ideology of expressjs
is still kept to allow better compatibility. Using [**Typescript**](http://www.typescriptlang.org/)
and the **es6 async/await** syntax, callbacks are way more readable and **the "normal" expressjs look (so called callback-hell) is a thing of the past**. Furthermore, classes bring a more structured architecture into your application (we do not force you to use classes. In fact, we also export the necessary functions to **code the handlers in a functional-way**). Another great thing is **semantic error throwing**: (just import scirocco's own error and then you can do the following: `throw Errors.NotFoundError` from within any of the 3 phases)

## Example
```typescript

// sample.ts

import { Request } from "express";
import { ApplicationRouter, createHandler, RequestHandler, scirocco } from "./";

// class-style request handler
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

// functional-style request handler
const handler = createHandler<Request, { name: string }, { account: { id: string }}>(
    (request) => ({ name: request.query.name }),
    (source): source is { name: string } => typeof source === "object" && "name" in source,
    (source) => ({ account: { id: source.name }}));

const app = new scirocco();

app.get("/", new SimpleRequestHandler().obtainHandler())
    .name("get-account-from-name")
    .description("gets an account from the database by a given name");

app.get("/name", handler)
    .name("get-account-from-name-v2")
    .description("gets an account from the database by a given name");

export const application = app;

```
Then you just need to compile your code and call it with the scirocco-cli (featuring **cluster-mode!**):
```bash
user@pc:~/$ scirocco start ./sample.js --verbose --cluster 5 --pport 8080 --force

┌─┐┌─┐┬┬─┐┌─┐┌─┐┌─┐┌─┐
└─┐│  │├┬┘│ ││  │  │ │
└─┘└─┘┴┴└─└─┘└─┘└─┘└─┘

> Importer[./sample.js] found handlers (total of 1 on root level)
      - get-account-from-name    [GET /    ]: gets an account from the database by a given name
      - get-account-from-name-v2 [GET /name]: gets a account from the database by a given name


> Master[23919] is running (planning 5 workers)
      - Worker[23931] is running
      - Worker[23949] is running
      - Worker[23925] is running
      - Worker[23938] is running
      - Worker[23937] is running
```
