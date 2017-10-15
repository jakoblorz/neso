import { NextFunction, Request, Response, Router as ExpressRouter, RouterOptions } from "express";
import { FormatError, ServerError } from "./error";
import { send } from "./http";
import {
    IMimeSerializer,
    ITransactionCallbackAlias,
    SourceTransactionCallbackFactory,
    SourceTypeConstructor,
    TargetTypeDestructor,
    TransactionCallbackMethod,
    TransactionCallbackType,
} from "./types";
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
