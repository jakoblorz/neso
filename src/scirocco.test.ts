import * as assert from "assert";
import * as mocha from "mocha";

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
