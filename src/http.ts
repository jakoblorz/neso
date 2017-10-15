import { Response } from "express";

import { Serializer, SupportedMimeType } from "./types";

/**
 * respond to a http request
 * @param body body object that needs to be serialized
 * @param serializer function to serialize the body type
 * @param mime body's mime type string
 * @param status http status code as number
 * @param res expressjs response object
 */
export const send = <X>(body: X, serializer: Serializer<X>,
    // tslint:disable-next-line:align
    mime: SupportedMimeType, status: number, res: Response) => {

        if (res.finished !== true) {
            res.setHeader("Content-Type", mime + "; charset=utf-8");
            res.status(status).end(serializer(body));
        }
    };
