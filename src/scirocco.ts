import { NextFunction, Request, RequestHandler, Response } from "express";

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
