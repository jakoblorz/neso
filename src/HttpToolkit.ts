import { Response } from "express";

import { MimeStringType } from "./types/MimeStringType";
import { MimeStringTypeSerializer } from "./types/MimeStringTypeSerializer";

/**
 * respond to a request with custom data that is being serialized
 * @param body data representation that will be serialized to be the http body
 * @param serializer unction to serialize the body into a string which will
 * be the actual http body
 * @param mime mime header
 * @param status statuscode number
 * @param res expressjs response object
 */
export const sendStructuredData =
    (body: any, serializer: MimeStringTypeSerializer, mime: MimeStringType, status: number, res: Response) => {

        // initialize data var where the serialized body will be stored
        let bodyData: string = "";

        try {

            // serialize the data and set the correct header
            bodyData = serializer(body);
            res.setHeader("Content-Type", mime + "; charset=utf-8");

        } catch (e) {

            try {

                // try to serialize by invoking the toString() method
                bodyData = body.toString();

            // tslint:disable-next-line:no-empty
            } catch (e2) { }

            // set the header to plain text
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
        }

        // respond with the serialized data after setting the status code
        res.status(status).send(bodyData);
    };
