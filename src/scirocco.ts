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

export interface IErrorType extends IResponseRepresentation {
    error?: Error;
}

export interface IResponse<T> extends IErrorType {
    error: undefined;
    result: T;
}

// tslint:disable-next-line:no-namespace
export namespace Errors {
    export const FormatError: IErrorType = {
        code: 400, status: "Format Error", error: undefined };
    export const UnauthorizedError: IErrorType = {
        code: 401, status: "Unauthorized Error", error: undefined };
    export const ForbiddenError: IErrorType = {
        code: 403, status: "Forbidden Error", error: undefined };
    export const NotFoundError: IErrorType = {
        code: 404, status: "Not Found Error", error: undefined };
    export const ServerError: IErrorType = {
        code: 500, status: "Server Error", error: undefined };
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
     */
    public obtainHandler(
        after?: (result: ResultType, req: Request, res: Response, next: NextFunction) => void | Promise<void>,
        invokedNextAfterExecution: boolean = false, invokeNextOnError: boolean = false,
        passPureErrors: boolean = false): RequestHandler {
            const that = this;
            const transaction = async (request: RequestType): Promise<ResultType> => {

                const source = await this.extract(request);

                if (!this.guard(source)) {
                    throw Errors.FormatError;
                }

                return this.callback(source);
            };

            return async (req: Request, res: Response, next: NextFunction) => {

                const result = await this.fetchPossibleErrors<ResultType>(transaction, that, req as RequestType);
                if (isErrorType(result)) {

                    if (invokeNextOnError && passPureErrors) {
                        next(result);
                        return;
                    }

                    if (invokeNextOnError) {
                        next(Errors.ServerError);
                        return;
                    }

                    if (passPureErrors) {
                        this.respond<IErrorType>(result, res, result.code);
                        return;
                    }

                    this.respond<IErrorType>(Errors.ServerError, res, Errors.ServerError.code);
                    return;
                }

                if (after !== undefined) {
                    const error = await this.fetchPossibleErrors<void>(after, that, result, req, res, next);
                    if (isErrorType(error)) {

                        if (invokeNextOnError) {
                            if (passPureErrors) {
                                next(error.error);
                                return;
                            }

                            next(error);
                            return;
                        }

                        if (passPureErrors) {
                            this.respond<Error | undefined>(error.error, res, error.code);
                            return;
                        }

                        this.respond<IErrorType>(error, res, error.code);
                        return;
                    }
                }

                if (invokedNextAfterExecution) {
                    next();
                    return;
                }

                this.respond<IResponse<ResultType>>(
                    { code: 200, error: undefined, result, status: "Success" }, res, 200);

            };
        }

    private async fetchPossibleErrors<T>(
        awaitable: (...args: any[]) => T | Promise<T>, context: any, ...args: any[]): Promise<T | IErrorType> {
            try { return await awaitable.apply(context, args); } catch (e) {
                if (isErrorType(e)) {
                    return e;
                }

                return { code: Errors.ServerError.code, status: Errors.ServerError.status, error: e } as IErrorType;
            }
        }

    private respond<ResponseType>(response: ResponseType, res: Response, status: number = 200) {
        res.status(status).json(response);
    }
}
