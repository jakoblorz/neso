import { NextFunction, Request, Response, Router as ExpressRouter, RouterOptions } from "express";

/* type aliases */
export type NesoError = { code: number, status: string };
export type NesoMimeType =  "application/json" | "application/javascript" |
    "text/plain" | "text/html" | "text/css" | "text/csv";
export type NesoSerializer<X> = (object: X) => string;
export type NesoSerializerMimeTuple<X> = { serializer: NesoSerializer<X>, mime: NesoMimeType };
export type NesoGuardMethod<X> = (object: X | any) => object is X;
export type NesoCallback<X, Y> = (object: X) => Y | Promise<Y> |
    NesoError | Promise<NesoError> | Promise<Y | NesoError>;
export type NesoCallbackType = "create" | "read" | "update" | "delete" | "exist";
export type NesoCallbackFactory<X> =
    (serializers: Array<NesoSerializerMimeTuple<any>>, type: NesoCallbackType, invokeNextOnError: boolean) =>
        (object: X, req: Request, res: Response, next: NextFunction) => void;
export type NesoRequestBuilder<X> = (req: Request) => X;
export type NesoExpressJSCallback = (req: Request, res: Response, next: NextFunction) => void;
export type NesoCallbackAlias =
    { callback: NesoExpressJSCallback, name: string, url: string, type: NesoCallbackType };

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

    res.setHeader("Content-Type", mime + "; charset=utf-8");
    res.status(status).send(serializer(body));
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
    guard: NesoGuardMethod<RequestType>, callback: NesoCallback<RequestType, ResponseType>,
    mime: NesoMimeType = "application/json"): NesoCallbackFactory<RequestType> => {

        // return a factory function which will select the correct serializer
        return (serializers: Array<NesoSerializerMimeTuple<any>>, type: NesoCallbackType,
                invokeNextOnError: boolean = false) => {

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
                        let response: ResponseType | NesoError | any = ServerError;
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

                        // no error occured, respond with the response, using the selected serializer,
                        // the correct http status code and the correct mime type
                        return send(response, serializer, mime, type === "create" ? 201 : 200, res);
                    };
        };
};

export class Router {

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
    private serializers: Array<NesoSerializerMimeTuple<any>>;

    /**
     * kv-translation of NesoCallbackType to HttpMethod
     */
    private typeMethodDictionary: any = {};

    /**
     * create a new router
     * @param options expressjs router options
     */
    constructor(options: RouterOptions | undefined, serializers: Array<NesoSerializerMimeTuple<any>>) {

        // initialize the expressjs router
        this.router = ExpressRouter(options);
        this.serializers = serializers;

        // load all NesoCallbackType to HttpMethod translations
        this.typeMethodDictionary.create = "post";
        this.typeMethodDictionary.read = "get";
        this.typeMethodDictionary.update = "put";
        this.typeMethodDictionary.delete = "delete";
        this.typeMethodDictionary.exist = "head";
    }

    /**
     * create<RequestType>
     */
    public create<RequestType>(
        url: string,
        name: string,
        build: NesoRequestBuilder<RequestType>,
        callback: NesoCallbackFactory<RequestType>) {
            this.hook("create", url, name, build, callback);
    }

    /**
     * read<RequestType>
     */
    public read<RequestType>(
        url: string,
        name: string,
        build: NesoRequestBuilder<RequestType>,
        callback: NesoCallbackFactory<RequestType>) {
            this.hook("read", url, name, build, callback);
    }

    /**
     * update<RequestType>
     */
    public update<RequestType>(
        url: string,
        name: string,
        build: NesoRequestBuilder<RequestType>,
        callback: NesoCallbackFactory<RequestType>) {
            this.hook("update", url, name, build, callback);
    }

    /**
     * delete<RequestType>
     */
    public delete<RequestType>(
        url: string,
        name: string,
        build: NesoRequestBuilder<RequestType>,
        callback: NesoCallbackFactory<RequestType>) {
            this.hook("delete", url, name, build, callback);
    }

    /**
     * exist<RequestType>
     */
    public exist<RequestType>(
        url: string,
        name: string,
        build: NesoRequestBuilder<RequestType>,
        callback: NesoCallbackFactory<RequestType>) {
            this.hook("exist", url, name, build, callback);
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

    private hook<RequestType>(
        type: NesoCallbackType,
        url: string,
        name: string,
        build: NesoRequestBuilder<RequestType>,
        callback: NesoCallbackFactory<RequestType>) {

            // indicate if there is at least one other route
            // registration with the same name which would
            // violate the unique name constraint
            const isDuplicateNameRoute = this.routes
                .filter((r) => r.name === name).length > 0;

            // throw an error if there is a unique name
            // constraint violation
            if (isDuplicateNameRoute) {
                throw new Error("duplicate name found: " + name + " was already loaded");
            }

            // indicate if there is at least one other route
            // registration with the same url and type, which
            // would violate the unique url-type association constraint
            const isDuplicateUrlTypeRoute = this.routes
                .filter((r) => r.url === url && r.type === type).length > 0;

            // throw an error if there is a unique url-type
            // association violation
            if (isDuplicateUrlTypeRoute) {
                throw new Error("duplicate url found: combination " + url + " and '" + type + "' was already loaded");
            }

            // invoke the factory callback (callback) with the type, the serializers
            // and the next-behavior flag invokeNextOnError
            const operation = callback(this.serializers, type, this.invokeNextOnError);

            // build the async expressjs callback from the newly generated
            // operation function
            const expressCallback = async (req: Request, res: Response, next: NextFunction) =>
                await operation(build(req), req, res, next);

            // there is no constraint violation and the callbacks were generated
            // successfully, push the route to the route list
            this.routes.push(({ callback: expressCallback, name, type, url }));
    }
}
