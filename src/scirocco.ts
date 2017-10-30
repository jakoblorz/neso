import { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";

/**
 * all thrown errors should extends this type
 */
export interface IResponseRepresentation {

    /**
     * specify the http status code which
     * will later be set from this field
     */
    code: number;

    /**
     * specify the status message inside
     * the response body
     */
    status: string;
}

/**
 * extension of the IResponseRepresentation interface
 * with added error capabilities
 */
export interface IErrorType extends IResponseRepresentation {

    /**
     * possible error
     */
    error?: Error;
}

/**
 * extension of the IResponseRepresentation interface
 * with result field
 */
export interface IResponse<T> extends IResponseRepresentation {
    result: T;
}

// tslint:disable-next-line:no-namespace
export namespace Errors {
    export const FormatError: IErrorType = { code: 400, status: "Format Error" };
    export const UnauthorizedError: IErrorType = { code: 401, status: "Unauthorized Error" };
    export const ForbiddenError: IErrorType = { code: 403, status: "Forbidden Error" };
    export const NotFoundError: IErrorType = { code: 404, status: "Not Found Error" };
    export const ServerError: IErrorType = { code: 500, status: "Server Error" };
}

/**
 * check if the given object is a object containing the ErrorType
 * keys with the correct types
 * @param object object to test
 */
export const isErrorType = (object: any): object is IErrorType =>
    typeof object === "object" &&
        "status" in object && typeof object.status === "string" &&
        "code" in object && typeof object.code === "number";

/**
 * create a new expressjs request handler using evaluation stages
 */
export abstract class ScaffoldedRequestHandler<RequestType extends Request, SourceType, ResultType> {

    /**
     * extract
     */
    public abstract extract(request: RequestType): SourceType | Promise<SourceType>;

    /**
     * guard
     */
    public abstract guard(source: any): source is SourceType;

    /**
     * callback
     */
    public abstract callback(source: SourceType): ResultType | Promise<ResultType>;

    /**
     * handler
     * @param after specify a function which will be invoked after the callback was invoked
     * @param invokedNextAfterExecution set flag to invoke the next function if the execution ended (e.g. as middleware)
     * @param invokeNextOnError set flag to invoke the next function if an error occurs
     * @param passPureErrors set flag not the exchange the errors with sendable error objects
     */
    public obtainHandler(
        after?: (result: ResultType, req: Request, res: Response, next: NextFunction) => void | Promise<void>,
        invokedNextAfterExecution: boolean = false, invokeNextOnError: boolean = false,
        passPureErrors: boolean = false): RequestHandler {

            // backup this context
            const that = this;

            // build a async function which invokes the extract callback, the
            // detects format errors by invoking the guard function and then
            // invoking the actual callback
            const transaction = async (request: RequestType): Promise<ResultType> => {

                const source = await this.extract(request);

                if (!this.guard(source)) {
                    throw Errors.FormatError;
                }

                return this.callback(source);
            };

            // return a expressjs request handler
            return async (req: Request, res: Response, next: NextFunction) => {

                // call the transaction function while catching all possible errors
                // detect errors and handle them according to the control flow switches
                // (invokeNextAfterExecution, invokeNextOnError, passPureErrors)
                const result = await this.fetchPossibleErrors<ResultType>(transaction, that, req as RequestType) as
                    ResultType;
                if (!this.proceedExecution<ResultType>(result, invokeNextOnError, passPureErrors, res, next)) {
                    return;
                }

                // detect if a after function is present
                if (after !== undefined) {

                    // call the after function while catching all possible errors
                    // detect errors and handle them according to the control flow switches
                    // (invokeNextAfterExecution, invokeNextOnError, passPureErrors)
                    const error = await this.fetchPossibleErrors<void>(after, that, result, req, res, next);
                    if (!this.proceedExecution<void>(error, invokeNextOnError, passPureErrors, res, next)) {
                        return;
                    }
                }

                // call next if control flow switch requires it
                if (invokedNextAfterExecution) {
                    next();
                    return;
                }

                // no next needed to be called, respond with success and
                // the result
                this.respond<IResponse<ResultType>>(
                    { code: 200, result, status: "Success" }, res, 200);

            };
        }

    /**
     * invoke a awaitable function while catching all possible errors
     * and replacing them with proper, sendable errors
     * @param awaitable function that returns T when called with arguments
     * @param context this context to invoke the awaitable function in
     * @param args arguments to call the awaitable function with
     */
    private async fetchPossibleErrors<T>(
        awaitable: (...args: any[]) => T | Promise<T>, context: any, ...args: any[]): Promise<T | IErrorType> {
            try { return await awaitable.apply(context, args); } catch (e) {
                if (isErrorType(e)) {
                    return e;
                }

                return { code: Errors.ServerError.code, status: Errors.ServerError.status, error: e } as IErrorType;
            }
        }

    /**
     * detect errors in a result object and change behavior accordingly
     * @param result object which can be the desired result or an error (either
     * wrapped or completely pure)
     * @param invokeNextOnError control-flow switch to invoke next if result is an error
     * @param passPureErrors control-flow switch to not replace errors with sendable objects
     * @param res expressjs response object
     * @param next expressjs next function
     */
    private proceedExecution<T>(
        result: T | IErrorType, invokeNextOnError: boolean,
        passPureErrors: boolean, res: Response, next: NextFunction) {
            if (isErrorType(result)) {

                if (invokeNextOnError) {
                    if (passPureErrors) {
                        next(result.error);
                        return false;
                    }

                    next(result);
                    return false;
                }

                if (passPureErrors) {
                    this.respond<{ error: Error | undefined }>({ error: result.error }, res, result.code);
                    return false;
                }

                this.respond<IErrorType>(result, res, result.code);
                return false;
            }

            return true;
        }

    private respond<ResponseType>(response: ResponseType, res: Response, status: number = 200) {
        res.status(status).json(response);
    }
}

export type SupportedMethods =
    "get" | "post" | "put" | "delete" | "patch" | "options" | "head" | "use" |
    "checkout" | "connect" | "copy" | "lock" | "merge" | "mkactivity" | "mkcol" | "move" |
    "m-search" | "notify" | "propfind" | "proppatch" | "purge" | "report" | "search" | "subscribe" |
    "trace" | "unlock" | "unsubscribe";
const SupportedMethodsStringArray = [
    "get" , "post" , "put" , "delete" , "patch" , "options" , "head" , "use" ,
    "checkout" , "connect" , "copy" , "lock" , "merge" , "mkactivity" , "mkcol" , "move" ,
    "m-search" , "notify" , "propfind" , "proppatch" , "purge" , "report" , "search" , "subscribe" ,
    "trace" , "unlock" , "unsubscribe"];

export type AnyHandler = RequestHandler | ErrorRequestHandler;

export interface IWrappedHandler {
    url: string;
    handler: ErrorRequestHandler | RequestHandler | IWrappedHandler[];
    method: SupportedMethods;
    name: string;
    description: string;
}

export const IWrappedHandlerGuard = (object: any): object is IWrappedHandler => {
return typeof object === "object" &&
    "url" in object && typeof object.url === "string" &&
    "handler" in object &&
        (typeof object.handler === "function" || object.handler instanceof Array) &&
    "method" in object && typeof object.method === "string" &&
        SupportedMethodsStringArray.indexOf(object.method) !== -1 &&
    "name" in object && typeof object.name === "string" &&
    "description" in object && typeof object.description === "string";
};

export interface IWrappedRouter extends IWrappedHandler {
    handler: IWrappedHandler[];
    method: "use";
}

export const IWrappedRouterGuard = (object: any): object is IWrappedRouter => {
    return IWrappedHandlerGuard(object) && object.handler instanceof Array &&
        object.method === "use";
};

export interface IWrappedErrorHandler extends IWrappedHandler {
    handler: ErrorRequestHandler;
}

export const IWrappedErrorHandlerGuard = (object: any): object is IWrappedErrorHandler => {
    return IWrappedHandlerGuard(object) && typeof object.handler === "function";
};

export interface IWrappedRequestHandler extends IWrappedHandler {
    handler: RequestHandler;
}

export const IWrappedRequestHandlerGuard = (object: any): object is IWrappedRequestHandler => {
    return IWrappedHandlerGuard(object) && typeof object.handler === "function";
};

export interface INameAccessor<T> {
    name: (name: string) => T;
}

export interface IDescriptionAccessor<T> {
    description: (description: string) => T;
}

export interface INameDescriptionAccessor {
    name: (name: string) => IDescriptionAccessor<void>;
    description: (description: string) => INameAccessor<void>;
}

// tslint:disable-next-line:max-classes-per-file
export class ApplicationRouter {

    public name: string = "";
    public description: string = "";
    public handler: IWrappedHandler[] = [];

    constructor(name?: string, description?: string) {
        this.name = name || "";
        this.description = description || "";
    }

    /**
     * get
     */
    public get(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("get", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * post
     */
    public post(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("post", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * put
     */
    public put(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("put", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * delete
     */
    public delete(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("delete", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * patch
     */
    public patch(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("patch", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * options
     */
    public options(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("options", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * head
     */
    public head(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("head", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * checkout
     */
    public checkout(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("checkout", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * connect
     */
    public connect(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("connect", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * copy
     */
    public copy(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("copy", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * lock
     */
    public lock(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("lock", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * merge
     */
    public merge(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("merge", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * mkactivity
     */
    public mkactivity(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("mkactivity", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * mkcol
     */
    public mkcol(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("mkcol", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * move
     */
    public move(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("move", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * m-search
     */
    public msearch(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("m-search", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * notify
     */
    public notify(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("notify", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * propfind
     */
    public propfind(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("propfind", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * proppatch
     */
    public proppatch(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("proppatch", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * purge
     */
    public purge(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("purge", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * report
     */
    public report(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("report", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * search
     */
    public search(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("search", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * subscribe
     */
    public subscribe(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("subscribe", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * trace
     */
    public trace(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("trace", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * unlock
     */
    public unlock(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("unlock", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * unsubscribe
     */
    public unsubscribe(url: string, handler: AnyHandler): INameDescriptionAccessor {
        this.enroute("unsubscribe", url, "", "", handler);
        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    /**
     * use
     */
    public use(url: string, handler: AnyHandler | ApplicationRouter) {
        if (typeof handler === "function") {
            this.enroute("use", url, "", "", handler);
            return this.buildNameDescriptionAccessor(this.handler.length - 1);
        }

        handler = handler as ApplicationRouter;
        this.handler.push({
            description: handler.description,
            handler: handler.handler,
            method: "use",
            name: handler.name,
            url,
        });

        return this.buildNameDescriptionAccessor(this.handler.length - 1);
    }

    private enroute(
        method: SupportedMethods, url: string, name: string, description: string,
        handler: ErrorRequestHandler | RequestHandler) {
            this.handler.push({
                description: description !== "" ? description : "",
                handler,
                method,
                name: name !== "" ? name : "",
                url,
            });

            // return the index of the inserted handler
            return this.handler.length - 1;
        }

    private buildNameDescriptionAccessor(index: number): INameDescriptionAccessor {

        const pureNameManipulation = (name: string) => { this.handler[index].name = name; };
        const pureDescriptionManipulation = (description: string) => { this.handler[index].description = description; };

        return {
            description: (description: string) => {
                pureDescriptionManipulation(description);
                return { name: pureNameManipulation };
            },
            name: (name: string) => {
                pureNameManipulation(name);
                return { description: pureDescriptionManipulation };
            },
        };
    }
}
