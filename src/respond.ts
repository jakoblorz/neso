import { Response } from "express";

/**
 * respond to a request by sending json data
 * @param payload object which will be the body (json-encoded)
 * @param res expressjs response object
 * @param status http status code
 */
export const respond = <ResponseType>(payload: ResponseType, res: Response, status: number = 200) =>
    res.status(status).json(payload);
