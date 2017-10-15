import { NextFunction, Request, Response, Router as ExpressRouter, RouterOptions } from "express";
import { FormatError, ServerError } from "./error";
import { send } from "./http";
import {
    GuardCallback,
    IError,
    IMimeSerializer,
    ITransactionCallbackAlias,
    Serializer,
    SourceTransactionCallback,
    SourceTransactionCallbackFactory,
    SourceTypeConstructor,
    SupportedMimeType,
    TargetTypeDestructor,
    TransactionCallback,
    TransactionCallbackMethod,
    TransactionCallbackType,
} from "./types";

/**
 * create a wrapped and guarded callback
 * @param guard function to validate that the request object is one of
 * type RequestType
 * @param callback function that will be invoked with the request object,
 * can return ResponseType, NesoError or both as promise
 * @param mime signal which mime type will be used
 */
export const module = <RequestType extends {}, ResponseType>(
    guard: GuardCallback<RequestType>, callback: TransactionCallback<RequestType, ResponseType>,
    mime: SupportedMimeType = "application/json"): SourceTransactionCallbackFactory<RequestType, ResponseType> => {

        // return a factory function which will select the correct serializer
        return (serializers: Array<IMimeSerializer<any>>, method: TransactionCallbackMethod | "all",
                type: TransactionCallbackType, invokeNextOnError: boolean = false) => {

                    // select the correct serializer for the mime string, default is
                    // JSON.stringify()
                    const serializer: Serializer<ResponseType> = serializers
                        .filter((s) => s.mime === mime)[0].serializer || JSON.stringify;

                    // result of the factory function is a expressjs styled handler
                    return async (object: RequestType, req: Request, res: Response, next: NextFunction) => {

                        // check if the recieved request object contains the required keys
                        if (!guard(object)) {

                            // request does not contain the necessary keys, respond with a JSON-encoded
                            // Format Error
                            send(FormatError, JSON.stringify, "application/json", FormatError.code, res);
                            return null;
                        }

                        // prepare a response object which will default to a ServerError (http error code: 500);
                        // prepare a error flag
                        let response: ResponseType | IError | any = FormatError;
                        let executionThrewError: boolean = false;

                        try {
                            // invoke the callback and wait for the result
                            response = await callback(object);

                        } catch (e) {
                            // catch possible errors during callback execution
                            // error will be set as the response while also setting
                            // the error flag to true
                            executionThrewError = true;
                            response = e;
                        }

                        // if an error occured and next-callback should be invoked,
                        // do it right here
                        if (executionThrewError && invokeNextOnError) {
                            next(response);
                            return null;
                        }

                        // if an error occured and the response object (which is the error object
                        // in this case), contains the code and status key, the error is expected
                        // the been thrown on purpose, following the NesoError Type
                        // (like throw NotFoundError) - encode the error as JSON in this case
                        // and respond with it
                        if (executionThrewError && "code" in response && "status" in response) {
                            send(response, JSON.stringify, "application/json", response.code, res);
                            return null;
                        }

                        // if an error occured and was not processed yet, the error must be something
                        // more concerning - respond with an JSON encoded general ServerError (http error code: 500)
                        if (executionThrewError) {
                            send(ServerError, JSON.stringify, "application/json", ServerError.code, res);
                            return null;
                        }

                        // no error occured
                        // if the callback is one of an endpoint respond with the response
                        // immediately
                        if (type === "endpoint") {
                            // respond with the response, using the selected serializer,
                            // the correct http status code and the correct mime type
                            send(response, serializer, mime, method === "create" ? 201 : 200, res);
                            return null;
                        }

                        // kind is middleware - the callbacks result needs to be returned
                        return response;
                    };
        };
};

export class TransactionRouter {

    /**
     * flag to change execution flow - true will invoke the next
     * callback if an error occured instead of responding with the error or a custom
     * server error. The next function will be invoked with the error as argument
     */
    public invokeNextOnError: boolean = false;

    /**
     * underlying expressjs router
     */
    private router: ExpressRouter;

    /**
     * list of all routes in this router
     */
    private routes: ITransactionCallbackAlias[] = [];

    /**
     * list of all serializers for the mime types hosted in this router
     */
    private serializers: Array<IMimeSerializer<any>>;

    /**
     * kv-translation of NesoCallbackType to HttpMethod
     */
    private typeMethodDictionary: any = {};

    /**
     * create a new router
     * @param options expressjs router options
     */
    constructor(options: RouterOptions | undefined, serializers: Array<IMimeSerializer<any>>) {

        // initialize the expressjs router
        this.router = ExpressRouter(options);
        this.serializers = serializers;

        // load all NesoCallbackType to HttpMethod translations
        this.typeMethodDictionary.create = "post";
        this.typeMethodDictionary.read = "get";
        this.typeMethodDictionary.update = "put";
        this.typeMethodDictionary.delete = "delete";
        this.typeMethodDictionary.exist = "head";
        this.typeMethodDictionary.all = "all";
    }

    /**
     * create<RequestType, ResponseType>
     */
    public create<RequestType, ResponseType>(
        url: string,
        name: string,
        construct: SourceTypeConstructor<RequestType>,
        callback: SourceTransactionCallbackFactory<RequestType, ResponseType>) {
            this.route("create", "endpoint", url, name, construct, callback);
    }

    /**
     * read<RequestType, ResponseType>
     */
    public read<RequestType, ResponseType>(
        url: string,
        name: string,
        construct: SourceTypeConstructor<RequestType>,
        callback: SourceTransactionCallbackFactory<RequestType, ResponseType>) {
            this.route("read", "endpoint", url, name, construct, callback);
    }

    /**
     * update<RequestType, ResponseType>
     */
    public update<RequestType, ResponseType>(
        url: string,
        name: string,
        construct: SourceTypeConstructor<RequestType>,
        callback: SourceTransactionCallbackFactory<RequestType, ResponseType>) {
            this.route("update", "endpoint", url, name, construct, callback);
    }

    /**
     * delete<RequestType, ResponseType>
     */
    public delete<RequestType, ResponseType>(
        url: string,
        name: string,
        construct: SourceTypeConstructor<RequestType>,
        callback: SourceTransactionCallbackFactory<RequestType, ResponseType>) {
            this.route("delete", "endpoint", url, name, construct, callback);
    }

    /**
     * build
     */
    public build(): ExpressRouter {

        for (const route of this.routes) {
            const method = this.typeMethodDictionary[route.method];
            (this.router as any)[method](route.url, route.callback);
        }

        return this.router;
    }

    /**
     * use<RequestType, ResponseType>
     */
    public use<RequestType, ResponseType>(
        url: string,
        method: TransactionCallbackMethod | "all",
        construct: SourceTypeConstructor<RequestType>,
        callback: SourceTransactionCallbackFactory<RequestType, ResponseType>,
        destruct: TargetTypeDestructor<ResponseType>) {
            this.route(method, "middleware", url, "", construct, callback, destruct);
    }

    private route<RequestType, ResponseType>(
        method: TransactionCallbackMethod | "all",
        type: TransactionCallbackType,
        url: string,
        name: string,
        construct: SourceTypeConstructor<RequestType>,
        callback: SourceTransactionCallbackFactory<RequestType, ResponseType>,
        destruct?: TargetTypeDestructor<ResponseType>) {

        // endpoint routes have some constraints that need to be met
        if (type === "endpoint") {

            // indicate if there is at least one other non-middleware
            // route registration with the same name which would
            // violate the unique name constraint
            const isDuplicateNameRoute = this.routes
                .filter((r) => r.type === "endpoint")
                .filter((r) => r.name === name).length > 0;

            // throw an error if there is a unique name
            // constraint violation
            if (isDuplicateNameRoute) {
                throw new Error("duplicate name found: " + name + " was already loaded");
            }

            // indicate if there is at least one other non-middleware
            // route registration with the same url and type, which
            // would violate the unique url-type association constraint
            const isDuplicateUrlMethodRoute = this.routes
                .filter((r) => r.type === "endpoint")
                .filter((r) => r.url === url && r.method === method).length > 0;

            // throw an error if there is a unique url-type
            // association violation
            if (isDuplicateUrlMethodRoute) {
                throw new Error("duplicate url found: " + url + " and '" + method + "' was already loaded");
            }
        }

        // invoke the factory callback (callback) with the type, the serializers
        // and the next-behavior flag invokeNextOnError
        const transaction = callback(this.serializers, method, type, this.invokeNextOnError);

        // build the async expressjs callback from the newly generated
        // transaction function
        const express = async (req: Request, res: Response, next: NextFunction) => {

            /* construction section */
            // prepare a request data object
            let request: RequestType = {} as RequestType;

            // try to construct the request data object
            // using the construct callback
            try { request = await construct(req); } catch (e) {

                // block requests that cannot be constructed
                send(FormatError, JSON.stringify, "application/json", FormatError.code, res);
                return null;
            }

            /* processing section */
            // prepare a result data object
            let result: ResponseType | null = {} as ResponseType;

            // try to invoke the operation callback
            // which might return something
            try { result = await transaction(request, req, res, next); } catch (e) {
                // it seems like the operation function did not catch all exceptions -
                // provide extract catch with a general ServerError response (http error code 500)
                send(ServerError, JSON.stringify, "application/json", ServerError.code, res);
                return null;
            }

            /* destruction section */
            // check if the destruction is wanted/required
            if (destruct && result !== null && result !== undefined) {

                // try to destruct the result
                // tslint:disable-next-line:no-empty
                try { await destruct(result, req); } catch (e) { }
            }

            if (type === "middleware") {
                next();
            }
        };

        // there is no constraint violation, the callbacks were all generated
        // successfully - push the route alias into the routes list
        this.routes.push({ callback: express, method, name, type, url });
    }
}
