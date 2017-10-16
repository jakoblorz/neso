# scirocco
add type guards to your expressjs request handlers

## idea/example
### recurring patterns
If your have already developed a http-api, your are aware of the always returning pattern:
1. a request is recieved and checked if all necessary arguments were sent
2. arguments get extracted
3. **the magic happens**
4. result is packed into the response object
5. error evaluation
6. response is being sent back

### abstracting the pattern
This can be simplified, while also enhancing types. The following example will hash a password which is url-encoded - *insecure!*. Types were added sometimes to help understanding.
1. create a SourceType and a TargetType for your callback action:
```typescript
//hash.ts
export interface IHashSource { password: string; }
export interface IHashTarget { hash: string; salt: string; }
```
2. create a type-guard:
```typescript
//hash.ts
const HashGuard = (object: any): object is IHashSource =>
    "password" in object && typeof object.password === "string";
```
3. export the guard-secured callback:
```typescript
//hash.ts
import * as crypto from "crypto";
import { secure } from "scirocco";

const hash = (payload: string) => {
    const salt = crypto.randomBytes(Math.ceil(64 / 2)).toString("hex").slice(0, 64);
    return { salt, hash: crypto.createHmac("sha512", salt).update(payload).digest("hex") };
};

export const callback = secure<IHashSource, IHashTarget>(
    HashGuard, (source: IHashSource): IHashTarget => hash(source.password));
```
4. import the callback and the types into your expressjs router:
```typescript
// router.ts
import { Request, Router } from "express";
import { scaffold } from "scirocco";
import { callback, IHashSource, IHashTarget } from "./hash";

interface IHashResponse { hash: string; }

const router: Router = Router();
```
5. scaffold the expressjs request-handler - using a construct-callback which selects the
necessary request arguments (like req.query.password), the callback and a destruct-callback
which reduces the result from the callback (destruct-callback is **optional**)
```typescript
// router.ts

// construct callback
const construct = (req: Request): IHashSource => ({ password: req.query.password });

// destruct callback
const destruct = (data: IHashTarget, req: Request, res: Response): IHashResponse =>
    ({ hash: data.hash });

// hook the scaffolded callback to GET /hash
router.get("/hash", scaffold<IHashSource, IHashTarget, IHashResponse>(
    construct, callback, destruct)); 
```
6. done! you now have a exception-stable, format-secure and type-asserted request handler to
hash a password (**NOTICE: the hashing mechanism shown here might not be secure - do not copy & paste this example for production**)

## full code example
```typescript
// hash.ts
import * as crypto from "crypto";
import { scaffold } from "scirocco";

// transaction types - source and target
export interface IHashSource { password: string; }
export interface IHashTarget { hash: string; salt: string; }

// function which hashes passwords using sha512 and a random salt
const hash = (payload: string): IHashTarget => {
    const salt = crypto.randomBytes(Math.ceil(64 / 2)).toString("hex").slice(0, 64);
    return { salt, hash: crypto.createHmac("sha512", salt).update(payload).digest("hex") };
};

// function which checks for correct format
const HashGuard = (object: any): object is IHashSource =>
    "password" in object && typeof object.password === "string";

// callback is a guarded callback transacting an IHashSource object to IHashTarget object
export const callback = secure<IHashSource, IHashTarget>(HashGuard, (source: IHashSource) =>
    hash(source.password));

```
```typescript
// router.ts
import { Request, Router } from "express";
import { scaffold } from "scirocco";
import { callback, IHashSource, IHashTarget } from "./hash";

// type of the response body
interface IHashResponse { hash: string; }

// initialization of the expressjs router
const router: Router = Router();


// construct callback
const construct = (req: Request): IHashSource => ({ password: req.query.password });

// destruct callback
const destruct = (data: IHashTarget, req: Request, res: Response): IHashResponse =>
    ({ hash: data.hash });

// hook the scaffolded callback to GET /hash
router.get("/hash", scaffold<IHashSource, IHashTarget, IHashResponse>(
    construct, callback, destruct)); 
```