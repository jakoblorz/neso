import { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * callback which transforms a source into a target
 */
type Transaction<SourceType, TargetType> = (source: SourceType) =>
    Promise<TargetType> | TargetType;

/**
 * callback which transforms a source into a target
 * with additional arguments (e.q. res to set custom headers)
 */
type Destruction<SourceType, TargetType> = (source: SourceType, req: Request, res: Response) =>
    Promise<TargetType> | TargetType;

/**
 * sugar - the same as Transaction but improves readability
 */
type Construction<SourceType, TargetType> = Transaction<SourceType, TargetType>;

/**
 * all thrown errors should extends this type
 */
export interface IErrorType {

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
 * add your own flavor to the factory
 */
export interface IConfiguration {

    /**
     * change the behavior if an error is being thrown/returned:
     * TRUE will force the handler to invoke the next-callback
     * with the error instead of responding to the client directly
     */
    invokeNextOnError?: boolean;

    /**
     * change the behavior during error handling:
     * TRUE forces the handler to only wrap the error into
     * a valid object which extends ErrorType.
     * FALSE forces the handler to replace the error with
     * a ServerError (500) - FALSE should be selected in
     * productive environments
     */
    passPureErrors?: boolean;
}

/**
 * scaffold a expressjs request handler - the phases construction,
 * transaction and destruction will bring more formality into your handler
 */
type ScaffoldMethod = <SourceType, TargetType extends ResponseType, ResponseType>(

    /**
     * construction callback - convert the expressjs request into the
     * required SourceType object for the operation
     */
    construct: Construction<Request, SourceType | IErrorType>,

    /**
     * transaction callback - actual processing happens here:
     * use the arguments that the construction phase extracted
     * from the request to achieve beautiful things!
     */
    transaction: Transaction<SourceType, TargetType | IErrorType>,

    /**
     * destruction callback - reduce the result of the transaction:
     * remove user-sensitive data from the result, add custom headers
     * to the response, add current user to the request object
     */
    destruct?: Destruction<TargetType, ResponseType | IErrorType>,

    /**
     * TRUE if the next callback should be invoked instead of sending a
     * response to the client (the destruct/transaction callback
     * result will be ignored)
     */
    middleware?: boolean,

    /**
     * set a custom http success code 200/201 etc.. if the execution succeeded
     */
    successCode?: number,
) => RequestHandler;

/**
 * scaffold a expressjs request handler - the phases construction,
 * transaction and destruction will bring more formality into your handler
 */
type ConfiguredScaffoldMethod = <SourceType, TargetType extends ResponseType, ResponseType>(

    /**
     * construction callback - convert the expressjs request into the
     * required SourceType object for the operation
     */
    construct: Construction<Request, SourceType | IErrorType>,

    /**
     * transaction callback - actual processing happens here:
     * use the arguments that the construction phase extracted
     * from the request to achieve beautiful things!
     */
    transaction: Transaction<SourceType, TargetType | IErrorType>,

    /**
     * destruction callback - reduce the result of the transaction:
     * remove user-sensitive data from the result, add custom headers
     * to the response, add current user to the request object
     */
    destruct?: Destruction<TargetType, ResponseType | IErrorType>,

    /**
     * change the behavior if an error is being thrown/returned:
     * TRUE will force the handler to invoke the next-callback
     * with the error instead of responding to the client directly
     */
    invokeNextOnError?: boolean,

    /**
     * change the behavior during error handling:
     * TRUE forces the handler to only wrap the error into
     * a valid object which extends ErrorType.
     * FALSE forces the handler to replace the error with
     * a ServerError (500) - FALSE should be selected in
     * productive environments
     */
    passPureErrors?: boolean,

    /**
     * set a custom http success code 200/201 etc.. if the execution succeeded
     */
    customSuccessCode?: number,

    /**
     * TRUE if the next callback should be invoked instead of sending a
     * response to the client (the destruct/transaction callback
     * result will be ignored)
     */
    isMiddlewareCallback?: boolean,
) => RequestHandler;

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
 * respond to a request by sending json data
 * @param payload object which will be the body (json-encoded)
 * @param res expressjs response object
 * @param status http status code
 */
export const respond = <ResponseType>(payload: ResponseType, res: Response, status: number = 200) =>
    res.status(status).json(payload);

/**
 * call a awaitable callback which might throw errors
 * @param awaitable awaitable callback
 * @param argument arguments to call the callback with
 * @param passPureErrors switch if unrecognized errors should
 * be replaced with a ServerError (-> http error code 500)
 */
export const evaluateAwaitable = async <X, Y> (awaitable: Transaction<X, Y | IErrorType>,
    argument: X, passPureErrors: boolean,
): Promise<Y | IErrorType> => {

    // return the result of the awaitable if the execution
    // went successful, catch possible errors
    try { return await awaitable(argument); } catch (e) {

        // check if the thrown error is of the type ErrorType
        if (isErrorType(e)) {

            // e is of the type ErrorType, immediate return is
            // possible
            return e;
        }

        // wrap the error into a new object which can be evaluated
        // as of the type ErrorType
        e = { code: Errors.ServerError.code, status: Errors.ServerError.status, error: e };

        // check return switch - return the wrapped error or
        // the ServerError as replacement
        return passPureErrors ? e : Errors.ServerError;
    }
};

/**
 * check if the result is an error type and process it if it is.
 * @param result object returned from the evaluateAwaitable function
 * @param req expressjs request object
 * @param res expressjs response object
 * @param next expressjs next-callback
 * @param invokeNextOnError switch to select behavior when errors occur
 */
export const processEvaluationResult = <X> (result: X | IErrorType, req: Request, res: Response,
    next: NextFunction, invokeNextOnError: boolean,
): X | null => {

    // is the result of type ErrorType and should
    // the next callback be invoked
    if (isErrorType(result) && invokeNextOnError) {
        next(result);
        return null;
    }

    // is the result of type ErrorType and the next
    // callback should not be invoked
    if (isErrorType(result)) {
        respond(result, res, result.code);
        return null;
    }

    // this function returns null if an error occured
    // which was processed or something else (else is
    // of type X) will be returned
    return result;
};

/**
 * prepare (convert) the given object into a sendable response
 * @param obj object to convert
 */
export const prepareResponseBody = <Type>(obj: Type, successCode: number = 200): IErrorType => {

    // check if the code (http status code) needs to be set
    if ((obj as any).code === undefined || typeof (obj as any).code !== "number") {
        (obj as any).code = successCode;
    }

    // check if the status needs to be set
    if ((obj as any).status === undefined || typeof (obj as any).status !== "string") {
        (obj as any).status = "Success";
    }

    // return the altered object
    return obj as any;
};

/**
 * scaffold a new expressjs request handler which is executing the different evaluation stages
 * automatically
 * @param construct callback which compiles the Request object into a RequestType object
 * @param transaction callback which will be executed
 * @param destruct callback which can be set to compile the result into a new object or
 * set custom values on the request object
 * @param invokeNextOnError flag which will change the control flow - instead of immediately
 * responding with and error if one is thrown, invoke the next callback with the error
 * @param passPureErrors flag which will indicate if errors which are not extending the
 * ErrorType should be replaced with a ServerError
 * @param customSuccessCode change the success code which is being sent if the callbacks
 * executed successfully
 * @param isMiddlewareCallback indicate to not respond but call next-callback when execution
 * successfully ends
 */
export const scaffold: ConfiguredScaffoldMethod = <SourceType, TargetType extends ResponseType, ResponseType> (
    construct: Construction<Request, SourceType | IErrorType>,
    transaction: Transaction<SourceType, TargetType | IErrorType>,
    destruct: Destruction<TargetType, ResponseType | IErrorType> =
        (source, req, res) => source,
    invokeNextOnError: boolean = false,
    passPureErrors: boolean = false,
    customSuccessCode: number = 200,
    isMiddlewareCallback: boolean = false,
): RequestHandler => {

    /**
     * @param awaitable awaitable callback
     * @param argument arguments to call the callback with
     * @see evaluateAwaitable()
     */
    const evaluate = async <X, Y> (awaitable: Transaction<X, Y | IErrorType>,
        argument: X): Promise<Y | IErrorType> =>
            evaluateAwaitable(awaitable, argument, passPureErrors);

    // return an expressjs request handler
    return async (req: Request, res: Response, next: NextFunction) => {

        /**
         * @param result object returned from the evaluateAwaitable function
         * @see processEvaluationResult()
         */
        const process = <X> (result: X | IErrorType) =>
            processEvaluationResult(result, req, res, next, invokeNextOnError);

        /**
         * @param awaitable awaitable callback
         * @param argument arguments to call the callback with
         * @see process()
         * @see processEvaluationResult()
         * @see evaluate()
         * @see evaluateAwaitable()
         */
        const executeStage = async <X, Y> (awaitable: Transaction<X, Y | IErrorType>,
            argument: X): Promise<Y | null> =>
                process(await evaluate(awaitable, argument));

        // execute the construction phase - extract the arguments from the request
        const source = await executeStage<Request, SourceType>(construct, req);
        if (source === null) {
            return;
        }

        // execute the transaction phase - process the arguments
        const target = await executeStage<SourceType, TargetType>(transaction, source);
        if (target === null) {
            return;
        }

        /**
         * destruct() callback wrapper to inject req, res
         * @param argument target data from the transaction callback
         * @see destruct()
         */
        const destruction = async (argument: TargetType) =>
            destruct(argument, req, res);

        // execute the destruction phase - reduce the result
        const response = await executeStage<TargetType, ResponseType>(destruction, target);
        if (response === null) {
            return;
        }

        // if this is represents a middleware RequestHandler,
        // do not respond to the client, call next() without any
        // arguments instead
        if (isMiddlewareCallback) {
            next();
            return;
        }

        // this represents not a middleware RequestHandler,
        // respond with the response converted into a http application/json
        // body to the client
        const body = prepareResponseBody(response, customSuccessCode);
        respond(body, res, body.code);
        return;
    };
};

/**
 * create a factory function which configures expressjs RequestHandlers
 * @param configuration add your own flavor
 */
export const config = (configuration: IConfiguration): ScaffoldMethod =>
    <SourceType, TargetType extends ResponseType, ResponseType>(
        construct: Construction<Request, SourceType | IErrorType>,
        transaction: Transaction<SourceType, TargetType | IErrorType>,
        destruct: Destruction<TargetType, ResponseType | IErrorType>,
        middleware: boolean = false,
        successCode: number = 200,
    ): RequestHandler =>
        scaffold(construct, transaction, destruct, configuration.invokeNextOnError,
            configuration.passPureErrors, successCode, middleware);

/**
 * guard a callback which transforms a SourceType object int a TargetType object
 * @param secure callback to evaluate if the given object is a valid SourceType
 * @param callback callback which is being invoked only if the given object is a valid SourceType
 */
export const guard = <SourceType, TargetType>(secure: (object: any) => object is SourceType,
    callback: Transaction<SourceType, TargetType | IErrorType>,
): Transaction<SourceType, TargetType | IErrorType> => {

    // return a async callback which takes the source and calls the callback
    // only if the guard (the secure callback) evaluates the source as valid
    // otherwise throw a FormatError which will be caught if this callback
    // is being hooked into the expressjs stack using the scaffold function
    return async (source: SourceType): Promise<TargetType | IErrorType> => {

        // check if the source object is a valid SourceType object
        if (!secure(source)) {

            // source object is not valid - throw an FormatError
            throw Errors.FormatError;
        }

        // source object is a valid object - call the callback
        // and return its promise
        return callback(source);
    };
};

// tslint:disable-next-line:max-line-length
export abstract class ScaffoldedEventHandler<RequestType extends Request, SourceType, TargetType extends ResponseType, ResponseType> {

    constructor(
        private configuration: IConfiguration = { invokeNextOnError: false, passPureErrors: false },
        private isMiddleware: boolean = false) { }

    public abstract construct(request: RequestType):
        SourceType | IErrorType | Promise<SourceType | IErrorType>;
    public abstract guard(object: any): object is SourceType;
    public abstract call(object: SourceType): TargetType | IErrorType | Promise<TargetType | IErrorType>;
    public combine(result: TargetType, req: RequestType, res: Response):
        ResponseType | IErrorType | Promise<ResponseType | IErrorType> {
            return result;
        }

    /**
     * handler
     */
    public handler() {
        const transaction = guard(this.guard, this.call);
        return scaffold<SourceType, TargetType, ResponseType>(
            this.construct, transaction, this.combine, this.isMiddleware);
    }
}

// tslint:disable-next-line:max-classes-per-file
class GetUserAccountFromId extends ScaffoldedEventHandler<Request, { acccountId: string }, { account: string }, {}> {

    public async construct(request: Request): Promise<IErrorType | { acccountId: string; }> {
        return ({ acccountId: request.params.id });
    }

    public guard(object: any): object is { acccountId: string; } {
        return typeof object === "object" &&
            "accountId" in object && typeof object.accountId === "string";
    }

    public async call(object: { acccountId: string; }): Promise<IErrorType | { account: string; }> {
        if (object.acccountId === "user1") {
            return { account: "user found" };
        }

        throw Errors.NotFoundError;
    }

    public async combine(result: { account: string; }, req: Request, res: Response): Promise<{} | IErrorType> {
        return result;
    }

}