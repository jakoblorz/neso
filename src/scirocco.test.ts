import * as assert from "assert";
import * as mocha from "mocha";

import { NextFunction, Request, Response } from "express";

import * as sci from "./scirocco";

describe("Errors", async () => {
    describe("isErrorType()", async () => {
        it("should detect Errors from Errors namespace as IErrorType", async () => {
            assert.equal(sci.Errors.isErrorType(sci.Errors.ForbiddenError), true);
            assert.equal(sci.Errors.isErrorType(sci.Errors.FormatError), true);
            assert.equal(sci.Errors.isErrorType(sci.Errors.NotFoundError), true);
            assert.equal(sci.Errors.isErrorType(sci.Errors.ServerError), true);
            assert.equal(sci.Errors.isErrorType(sci.Errors.UnauthorizedError), true);
        });
    });
});

describe("fetchPossibleErrors<T>()", async () => {
    it("should return result when no error occurs", async () => {
        const result = await sci.fetchPossibleErrors((name: string) => name, undefined, "user");
        assert.equal(result, "user");
    });

    it("should fetch IErrorType Error and return it as-is", async () => {
        const error = await sci.fetchPossibleErrors((name: string) => {
            throw sci.Errors.ForbiddenError; }, undefined, "user");
        assert.deepEqual(error, sci.Errors.ForbiddenError);
    });

    it("should fetch generic Error and return it wrapped", async () => {
        const error = new Error("error");
        const result = await sci.fetchPossibleErrors((name: string) => {
            throw error; }, undefined, "user");
        assert.equal(sci.Errors.isErrorType(result), true);
        assert.deepEqual(result.error, error);
    });
});

describe("ApplicationRouter", async () => {

    const router = new sci.ApplicationRouter();

    sci.SupportedMethodsStringArray
        .filter((method) => method !== "use")
        .forEach((method) => {
            it("should support " + method + " http method", async () => {

                const routerHandlerLengthBefore = router.handler.length;
                const accessors = (router as any)[method === "m-search" ? "msearch" : method](
                     "/", (req: Request, res: Response, next: NextFunction) => null);

                assert.equal("name" in accessors, true);
                assert.equal("description" in accessors, true);

                assert.equal(routerHandlerLengthBefore + 1, router.handler.length);
                assert.equal(router.handler[router.handler.length - 1].name, "");
                assert.equal(router.handler[router.handler.length - 1].description, "");
                assert.equal(router.handler[router.handler.length - 1].method, method);

                const stage1AccessorDescription = accessors.name("altered name 1");
                const stage1AccessorName = accessors.description("altered description 1");
                assert.equal(router.handler[router.handler.length - 1].name, "altered name 1");
                assert.equal(router.handler[router.handler.length - 1].description, "altered description 1");

                assert.equal("name" in stage1AccessorDescription, false);
                assert.equal("description" in stage1AccessorDescription, true);
                assert.equal("name" in stage1AccessorName, true);
                assert.equal("description" in stage1AccessorName, false);

                stage1AccessorDescription.description("altered description 2");
                stage1AccessorName.name("altered name 2");
                assert.equal(router.handler[router.handler.length - 1].name, "altered name 2");
                assert.equal(router.handler[router.handler.length - 1].description, "altered description 2");
            });
        });
});
