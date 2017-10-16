import { NextFunction, Request, RequestHandler, Response } from "express";

/* pure types */
export type ErrorType = { code: number, status: string };
export type AsyncTransactionMethod<SourceType, TargetType> = (source: SourceType) =>
    Promise<TargetType>;
export type SyncTransactionMethod<SourceType, TargetType> = (source: SourceType) =>
    TargetType;
export type AsyncDestructionMethod<SourceType, TargetType> = (source: SourceType, req: Request) =>
    Promise<TargetType>;
export type SyncDestructionMethod<SourceType, TargetType> = (source: SourceType, req: Request) =>
    TargetType;

/* combined types */
export type AsyncSyncTransactionMethod<SourceType, TargetType> =
    AsyncTransactionMethod<SourceType, TargetType> | SyncTransactionMethod<SourceType, TargetType>;
export type AsyncSyncDestructionMethod<SourceType, TargetType> =
    AsyncDestructionMethod<SourceType, TargetType> | SyncDestructionMethod<SourceType, TargetType>;

/* error definitions */
export const FormatError: ErrorType = { code: 400, status: "Format Error" };
export const UnauthorizedError: ErrorType = { code: 401, status: "Unauthorized Error" };
export const ForbiddenError: ErrorType = { code: 403, status: "Forbidden Error" };
export const NotFoundError: ErrorType = { code: 404, status: "Not Found Error" };
export const ServerError: ErrorType = { code: 500, status: "Server Error" };

const respond = <ResponseType>(payload: ResponseType, res: Response, status: number = 200) =>
    res.status(status).json(payload);

/**
 * scaffold a new expressjs request handler which is executing the different evaluation stages
 * automatically
 * @param construct callback which compiles the Request object into a RequestType object
 * @param callback callback which will be executed
 * @param destruct callback which can be set to compile the result into a new object or
 * set custom values on the request object
 * @param invokeNextOnError flag which will change the control flow - instead of immediately
 * responding with and error if one is thrown, invoke the next callback with the error
 * @param passPureErrors flag which will indicate if errors which are not extending the
 * ErrorType should be replaced with a ServerError
 * @param customSuccessCode change the success code which is being sent if the callbacks
 * executed successfully
 */
export const scaffold = <SourceType, TargetType extends ResponseType, ResponseType>(
    construct: AsyncSyncTransactionMethod<Request, SourceType | ErrorType>,
    callback: AsyncSyncTransactionMethod<SourceType, TargetType | ErrorType>,
    destruct?: AsyncSyncTransactionMethod<TargetType, ResponseType | ErrorType>,
    invokeNextOnError: boolean = false,
    passPureErrors: boolean = false,
    customSuccessCode: number = 200,
): RequestHandler => {

    // return an expressjs request handler
    return async (req: Request, res: Response, next: NextFunction) => {

        /**
         * check if the given object is a object containing the ErrorType
         * keys with the correct types
         * @param test object to test
         */
        const isErrorType = (test: any) =>
            "status" in test && typeof test.status === "string" &&
            "code" in test && typeof test.code === "number";

        /**
         * execute the async callback while catching and filtering
         * all possible errors
         * @param awaitable async method which converts type X into
         * type Y or and Error while throwing possibly errors
         * @param arg argument to call the async method with
         */
        const executeTryCatchEvaluation = async <X, Y> (
            awaitable: AsyncSyncTransactionMethod<X, Y | ErrorType>, arg: X): Promise<Y | null> => {

                // prepare a object which will hold the result of the async callback
                let data: Y | ErrorType =  {} as Y;
                // invoke the callback while catching all possible errors
                try { data = await awaitable(arg); } catch (e) {

                    // filter the error by checking if it extends the
                    // ErrorType

                    // if the error is an error extending the ErrorType
                    // and next callback should be invoked
                    if (isErrorType(e) && invokeNextOnError) {
                        next(e);
                        return null;
                    }

                    // if the error is an error extending the ErrorType
                    if (isErrorType(e)) {
                        respond(e, res, e.code);
                        return null;
                    }

                    // error e is not extending the ErrorType
                    e = { code: ServerError.code, status: ServerError.status, error: e };

                    // if the error is not an error extending the ErrorType
                    // yet the next callback should be invoked
                    if (invokeNextOnError) {

                        // depending on the setting passPureErrors,
                        // replace the error with a ServerError or use the pure on
                        next(passPureErrors ? e : ServerError);
                        return null;
                    }

                    // if the error is not an error extending the ErrorType
                    // and the next callback should not be invoked
                    respond(passPureErrors ? e : ServerError, res, ServerError.code);
                    return null;
                }

                // if the result (data) is extending the Error Type, an error
                // occured and the control-flow needs to be altered:
                // here the next callback should be called
                if (isErrorType(data as any) && invokeNextOnError) {
                    next(data);
                    return null;
                }

                // here the error should be immediately responded
                if (isErrorType(data as any)) {
                    respond(data, res, (data as any).code);
                    return null;
                }

                // return the data -> return type is Y if the
                // async callback did not return an error in any way
                // return type is null if an error was produced and processed
                return data as Y;
            };

        /**
         * prepare (convert) the given object into a sendable response
         * @param obj object to convert
         */
        const prepareSuccessObject = <Type>(obj: Type): ErrorType => {

            // check if the code (http status code) needs to be set
            if ((obj as any).code === undefined || typeof (obj as any).code !== "number") {
                (obj as any).code = customSuccessCode;
            }

            // check if the status needs to be set
            if ((obj as any).status === undefined || typeof (obj as any).status !== "string") {
                (obj as any).status = "Success";
            }

            // return the altered object
            return obj as any;
        };

        // execute the construction phase - extract the arguments from the request
        const constructResult = await executeTryCatchEvaluation<Request, SourceType>(construct, req);
        if (constructResult === null) {
            return null;
        }

        // execute the callback phase - process the arguments
        const callbackResult = await executeTryCatchEvaluation<SourceType, TargetType>(callback, constructResult);
        if (callbackResult === null) {
            return null;
        }

        // set the respond object as the callback result
        let response = callbackResult as TargetType | ResponseType | null;

        // execute the destruction phase - reduce the result
        if (destruct !== undefined) {
            // change the response object in the destruction phase
            response = await executeTryCatchEvaluation<TargetType, ResponseType>(destruct, callbackResult);

            // the response can now be null - if the response channel
            // closed already (req.finished) then a error occured
            // -> stop the execution
            if (response === null && res.finished) {
                return null;
            }

            // the response channel was not closed yet thus the response
            // should be the callbackResult
            if (response === null) {
                response = callbackResult;
            }
        }

        // prepare the body and respond with it using the set status code
        const responseBody = prepareSuccessObject(response);
        respond(responseBody, res, responseBody.code);

        // execution flow ends here - unneeded
        return null;
    };
};
