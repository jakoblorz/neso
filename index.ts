import { NextFunction, Request, Response, Router as ExpressRouter, RouterOptions } from "express";

/* type aliases */
export type NesoError = { code: number, status: string };
export type NesoMimeType =  "application/json" | "application/javascript" |
    "text/plain" | "text/html" | "text/css" | "text/csv";
export type NesoSerializer<X> = (object: X) => string;
export type NesoMimeSerializer<X> = { serializer: NesoSerializer<X>, mime: NesoMimeType };
export type NesoGuard<X> = (object: X | any) => object is X;
export type NesoCallback<X, Y> = (object: X) => Y | Promise<Y> |
    NesoError | Promise<NesoError> | Promise<Y | NesoError>;
export type NesoCallbackType = "create" | "read" | "update" | "delete" | "exist";
export type NesoCallbackKind = "middleware" | "endpoint";
export type NesoCallbackFactory<X, Y> = (
    serializers: Array<NesoMimeSerializer<any>>,
    type: NesoCallbackType | "all",
    kind: NesoCallbackKind,
    invokeNextOnError: boolean) =>
        (object: X, req: Request, res: Response, next: NextFunction) => Promise<Y> | Y | void;
export type NesoRequestConstructor<X> = (req: Request) => Promise<X> | X;
export type NesoResponseDestructor<X> = (response: X, req: Request) => Promise<void> | void;
export type NesoExpressJSCallback = (req: Request, res: Response, next: NextFunction) => void;
export type NesoCallbackAlias = {
    kind: NesoCallbackKind;
    callback: NesoExpressJSCallback;
    name: string;
    url: string;
    type: NesoCallbackType | "all";
};

/* error definitions */
export const FormatError: NesoError = { code: 400, status: "Format Error" };
export const UnauthorizedError: NesoError = { code: 401, status: "Unauthorized Error" };
export const ForbiddenError: NesoError = { code: 403, status: "Forbidden Error" };
export const NotFoundError: NesoError = { code: 404, status: "Not Found Error" };
export const ServerError: NesoError = { code: 500, status: "Server Error" };

/**
 * respond to a http request
 * @param body body object that needs to be serialized
 * @param serializer function to serialize the body type
 * @param mime body's mime type string
 * @param status http status code as number
 * @param res expressjs response object
 */
export const send = <X>(
    body: X, serializer: NesoSerializer<X>,
    mime: NesoMimeType, status: number, res: Response) => {

        if (res.finished !== true) {
            res.setHeader("Content-Type", mime + "; charset=utf-8");
            res.status(status).end(serializer(body));
        }
    };

/**
 * create a wrapped and guarded callback
 * @param guard function to validate that the request object is one of
 * type RequestType
 * @param callback function that will be invoked with the request object,
 * can return ResponseType, NesoError or both as promise
 * @param mime signal which mime type will be used
 */
export const module = <RequestType extends {}, ResponseType>(
    guard: NesoGuard<RequestType>, callback: NesoCallback<RequestType, ResponseType>,
    mime: NesoMimeType = "application/json"): NesoCallbackFactory<RequestType, ResponseType> => {

        // return a factory function which will select the correct serializer
        return (serializers: Array<NesoMimeSerializer<any>>, type: NesoCallbackType | "all",
                kind: NesoCallbackKind, invokeNextOnError: boolean = false) => {

                    // select the correct serializer for the mime string, default is
                    // JSON.stringify()
                    const serializer: NesoSerializer<ResponseType> = serializers
                        .filter((s) => s.mime === mime)[0].serializer || JSON.stringify;

                    // result of the factory function is a expressjs styled handler
                    return async (object: RequestType, req: Request, res: Response, next: NextFunction) => {

                        // check if the recieved request object contains the required keys
                        if (!guard(object)) {

                            // request does not contain the necessary keys, respond with a JSON-encoded
                            // Format Error
                            return send(FormatError, JSON.stringify, "application/json", FormatError.code, res);
                        }

                        // prepare a response object which will default to a ServerError (http error code: 500);
                        // prepare a error flag
                        let response: ResponseType | NesoError | any = FormatError;
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
                            return next(response);
                        }

                        // if an error occured and the response object (which is the error object
                        // in this case), contains the code and status key, the error is expected
                        // the been thrown on purpose, following the NesoError Type
                        // (like throw NotFoundError) - encode the error as JSON in this case
                        // and respond with it
                        if (executionThrewError && "code" in response && "status" in response) {
                            return send(response, JSON.stringify, "application/json", response.code, res);
                        }

                        // if an error occured and was not processed yet, the error must be something
                        // more concerning - respond with an JSON encoded general ServerError (http error code: 500)
                        if (executionThrewError) {
                            return send(ServerError, JSON.stringify, "application/json", ServerError.code, res);
                        }

                        // no error occured
                        // if the callback is one of an endpoint respond with the response
                        // immediately
                        if (kind === "endpoint") {
                            // respond with the response, using the selected serializer,
                            // the correct http status code and the correct mime type
                            return send(response, serializer, mime, type === "create" ? 201 : 200, res);
                        }

                        // kind is middleware - the callbacks result needs to be returned
                        return response;
                    };
        };
};

export class NesoRouter {

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
    private routes: NesoCallbackAlias[] = [];

    /**
     * list of all serializers for the mime types hosted in this router
     */
    private serializers: Array<NesoMimeSerializer<any>>;

    /**
     * kv-translation of NesoCallbackType to HttpMethod
     */
    private typeMethodDictionary: any = {};

    /**
     * create a new router
     * @param options expressjs router options
     */
    constructor(options: RouterOptions | undefined, serializers: Array<NesoMimeSerializer<any>>) {

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
        construct: NesoRequestConstructor<RequestType>,
        callback: NesoCallbackFactory<RequestType, ResponseType>) {
            this.hook("create", "endpoint", url, name, construct, callback);
    }

    /**
     * read<RequestType, ResponseType>
     */
    public read<RequestType, ResponseType>(
        url: string,
        name: string,
        construct: NesoRequestConstructor<RequestType>,
        callback: NesoCallbackFactory<RequestType, ResponseType>) {
            this.hook("read", "endpoint", url, name, construct, callback);
    }

    /**
     * update<RequestType, ResponseType>
     */
    public update<RequestType, ResponseType>(
        url: string,
        name: string,
        construct: NesoRequestConstructor<RequestType>,
        callback: NesoCallbackFactory<RequestType, ResponseType>) {
            this.hook("update", "endpoint", url, name, construct, callback);
    }

    /**
     * delete<RequestType, ResponseType>
     */
    public delete<RequestType, ResponseType>(
        url: string,
        name: string,
        construct: NesoRequestConstructor<RequestType>,
        callback: NesoCallbackFactory<RequestType, ResponseType>) {
            this.hook("delete", "endpoint", url, name, construct, callback);
    }

    /**
     * exist<RequestType, ResponseType>
     */
    public exist<RequestType, ResponseType>(
        url: string,
        name: string,
        construct: NesoRequestConstructor<RequestType>,
        callback: NesoCallbackFactory<RequestType, ResponseType>) {
            this.hook("exist", "endpoint", url, name, construct, callback);
    }

    /**
     * use<RequestType, ResponseType>
     */
    public use<RequestType, ResponseType>(
        url: string,
        type: NesoCallbackType | "all",
        construct: NesoRequestConstructor<RequestType>,
        callback: NesoCallbackFactory<RequestType, ResponseType>,
        destruct: NesoResponseDestructor<ResponseType>) {
            this.hook(type, "middleware", url, "", construct, callback, destruct);
    }

    /**
     * build
     */
    public build() {

        for (const route of this.routes) {
            const method = this.typeMethodDictionary[route.type];
            (this.router as any)[method](route.url, route.callback);
        }

        return this.router;
    }

    private hook<RequestType, ResponseType>(
        type: NesoCallbackType | "all",
        kind: NesoCallbackKind,
        url: string,
        name: string,
        construct: NesoRequestConstructor<RequestType>,
        callback: NesoCallbackFactory<RequestType, ResponseType>,
        destruct?: NesoResponseDestructor<ResponseType>) {

            // indicate if there is at least one other non-middleware
            // route registration with the same name which would
            // violate the unique name constraint
            const isDuplicateNameRoute = this.routes
                .filter((r) => r.kind !== "middleware")
                .filter((r) => r.name === name).length > 0;

            // throw an error if there is a unique name
            // constraint violation
            if (isDuplicateNameRoute) {
                throw new Error("duplicate name found: " + name + " was already loaded");
            }

            // indicate if there is at least one other non-middleware
            // route registration with the same url and type, which
            // would violate the unique url-type association constraint
            const isDuplicateUrlTypeRoute = this.routes
                .filter((r) => r.kind !== "middleware")
                .filter((r) => r.url === url && r.type === type).length > 0;

            // throw an error if there is a unique url-type
            // association violation
            if (isDuplicateUrlTypeRoute) {
                throw new Error("duplicate url found: combination " + url + " and '" + type + "' was already loaded");
            }

            // invoke the factory callback (callback) with the type, the serializers
            // and the next-behavior flag invokeNextOnError
            const operation = callback(this.serializers, type, kind, this.invokeNextOnError);

            // build the async expressjs callback from the newly generated
            // operation function
            const expressCallback = async (req: Request, res: Response, next: NextFunction) => {

                /* construction section */
                // prepare a request data object
                let request: RequestType = {} as RequestType;

                try {
                    // try to construct the request data object
                    // using the construct callback
                    request = await construct(req);

                } catch (e) {

                    // block requests that cannot be constructed
                    return send(FormatError, JSON.stringify, "application/json", FormatError.code, res);
                }

                /* processing section */
                // prepare a result data object
                let result: ResponseType | void = {} as ResponseType;

                try {
                    // try to invoke the operation callback which might return something
                    result = await operation(request, req, res, next);

                } catch (e) {
                    // it seems like the operation function did not catch all exceptions -
                    // provide extract catch with a general ServerError response (http error code 500)
                    return send(ServerError, JSON.stringify, "application/json", ServerError.code, res);
                }

                /* destruction section */
                // check if the destruction is wanted/required
                if (destruct && result !== null && result !== undefined) {

                    try {
                        // try to destruct the result
                        await destruct(result, req);

                    // tslint:disable-next-line:no-empty
                    } catch (e) { }
                }

            };

            // there is no constraint violation and the callbacks were generated
            // successfully, push the route to the route list
            this.routes.push({ callback: expressCallback, name, type, url, kind });
    }
}
