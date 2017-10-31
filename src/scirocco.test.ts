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
