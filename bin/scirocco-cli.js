#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chalkDep = require("chalk");
var cluster = require("cluster");
var express = require("express");
var os = require("os");
var path = require("path");
var scirocco_1 = require("../src/scirocco");
var chalk = chalkDep.default;
/**
 * added spaces to all strings that are shorted than the longest one
 * to make them even
 * @param strings list of strings that should be made even
 */
var spaceStringEven = function (strings) {
    var maxLength = strings.reduce(function (max, s) { return s.length > max ? s.length : max; }, 0);
    return strings.map(function (s) { return s +
        (function (l) { return new Array(maxLength - l + 1).join(" "); })(s.length); });
};
/**
 * list all handlers that got hooked to the AppWrapper
 * @param handlerList list of all imported handlers
 * @param file path to the imported file
 */
var printHandlers = function (handlerList, file) {
    /**
     * recurse over the list of handlers and log all of them to the console
     * @param handlers list of all imported handlers on the current layer
     * @param generalOffset offset of spaces to write handler to
     */
    var printHandlersResolvingCascading = function (handlers, generalOffset) {
        if (generalOffset === void 0) { generalOffset = 0; }
        // event the length differences between the strings of name, method and url
        var names = spaceStringEven(handlers.map(function (h) { return h.name; }));
        var methods = spaceStringEven(handlers.map(function (h) { return h.method; }));
        var urls = spaceStringEven(handlers.map(function (h) { return h.url; }));
        var lightHandlers = handlers.map(function (h, i) { return ({ description: h.description, handler: h.handler,
            method: methods[i].toUpperCase(), name: names[i], url: urls[i] }); });
        for (var _i = 0, lightHandlers_1 = lightHandlers; _i < lightHandlers_1.length; _i++) {
            var handler = lightHandlers_1[_i];
            // detect if this handler is a router
            var isRouter = handler.handler instanceof Array;
            // logging handlers will require the text to be offseted x-wise
            var xOffsetText = new Array(generalOffset + 1).join(" ");
            // depending wether the current handler is a router, the url text should look
            // differently: either with http-method or with replacement (RTER)
            var xUrlText = isRouter ?
                " [" + chalk.red("RTER") + " " + chalk.blueBright(handler.url) + "]: " :
                " [" + chalk.red(handler.method.toUpperCase()) + " " + chalk.blueBright(handler.url) + "]: ";
            // the line start (tick-mark) is different depending wether the current
            // handler is a router or not: - vs >. The handler name should look different also.
            var xTickMark = chalk.greenBright(isRouter ? " > " : " - ");
            var xHandlerName = isRouter ? chalk.green(handler.name) : chalk.greenBright(handler.name);
            // in router mode, add a new line without any text for better readablity
            if (isRouter) {
                console.log("");
            }
            console.log(xOffsetText + xTickMark + xHandlerName + xUrlText + handler.description);
            // recursion-call only if this handler is a router which introduces
            // a new layer of handlers
            if (isRouter) {
                printHandlersResolvingCascading(handler.handler, generalOffset + 5);
            }
        }
    };
    // write the import-header
    console.log(chalk.greenBright("> Importer") + "[" +
        chalk.blueBright(file) + "] found handlers (total of " +
        chalk.blueBright(handlerList.length + "") + " on root level)");
    // write all found handlers to the console, offsetted by their respective layer
    printHandlersResolvingCascading(handlerList, 5);
    // add to spaces the split sections
    console.log("");
    console.log("");
};
/**
 * connect all handlers to a expressjs router instance
 * @param handlers list of all imported handlers
 * @param router router object which will recieve all handlers
 */
var buildExpressJSStackFromHandlerList = function (handlers, router) {
    // iterate over all handlers
    for (var _i = 0, handlers_1 = handlers; _i < handlers_1.length; _i++) {
        var handler = handlers_1[_i];
        // different processing depending on wether the handler is
        // a router or just a plain handler
        if (typeof handler.handler === "function") {
            router[handler.method](handler.url, handler.handler);
        }
        else {
            // recursive-call of this function: build a router for the given set of
            // handler-objects
            var sr = buildExpressJSStackFromHandlerList(handler.handler, express.Router());
            router[handler.method](handler.url, sr);
        }
    }
    return router;
};
/**
 * import a AppWrapper instance and check its validity
 * @param link path to the import file
 */
var importAppWrapperFileFromRelativePath = function (link) {
    // import the file to access the exported objects
    var file = require(path.join(process.cwd(), link));
    // the file should only export one key
    if (Object.keys(file).length < 1) {
        throw Error("import error: file " + file + " does not export any key");
    }
    if (Object.keys(file).length > 1) {
        throw Error("import error: file " + file + " exports more than one key - specify!");
    }
    // find the export-key and extract the value of it
    var exportKey = Object.keys(file).filter(function (k, i) { return i === 0; })[0];
    var wrapper = file[exportKey];
    // check if the extracted value (wrapper) is a valid AppWrapper object
    if (!("handler" in wrapper) || !("name" in wrapper) || !("handler" in wrapper && "name" in wrapper)) {
        throw Error("import error: exported object is not a valid AppWrapper");
    }
    // select all handler present in the handler array in the AppWrapper object
    // which satifies either RequestHandler, ErrorHandler or Router constraints
    return wrapper.handler.filter(function (h) {
        return scirocco_1.IWrappedRequestHandlerGuard(h) || scirocco_1.IWrappedErrorHandlerGuard(h) || scirocco_1.IWrappedRouterGuard(h);
    });
};
/**
 * print the hermelin logo to the console
 */
var printLogo = function () {
    console.log("");
    console.log(chalk.blueBright("┌─┐┌─┐┬┬─┐┌─┐┌─┐┌─┐┌─┐"));
    console.log(chalk.blueBright("└─┐│  │├┬┘│ ││  │  │ │"));
    console.log(chalk.blueBright("└─┘└─┘┴┴└─└─┘└─┘└─┘└─┘"));
    console.log("");
};
// tslint:disable-next-line:no-var-requires
var vorpal = require("vorpal")();
vorpal.command("list <path>", "list all handlers found in the file")
    .action(function (args) {
    // import all handlers from the given file
    var handlers = importAppWrapperFileFromRelativePath(args.path);
    printLogo();
    printHandlers(handlers, args.path);
});
vorpal.command("start <path>", "build a expressjs app from the file and start it")
    .option("-v, --verbose", "log found handlers to the console")
    .option("-p, --port <number>", "use custom port number - default is 8080")
    .option("-h, --hostname <name>", "specify the hostname to listen to - default is localhost")
    .option("-c, --cluster [number]", "start the app in cluster mode / specify the number of workers - default is 1")
    .option("-f, --force", "restart workers if they exit")
    .action(function (args) {
    // parse the port, hostname and import all handlers from the given file
    var port = parseInt(args.options.port, 10) || args.options.port || 8080;
    var hostname = args.options.hostname || "localhost";
    var handlers = importAppWrapperFileFromRelativePath(args.path);
    // prepare worker/master text beginnings
    var xWorkerTextIdent = function (state) { return state === "run" ?
        chalk.greenBright(new Array(5 + 1).join(" ") + " - Worker") + "[" +
            chalk.blueBright(process.pid + "") + "]" :
        chalk.redBright(new Array(5 + 1).join(" ") + " - Worker") + "[" +
            chalk.blueBright(process.pid + "") + "]"; };
    var xMasterTextIdent = function (state) { return state === "run" ?
        chalk.greenBright("> Master") + "[" +
            chalk.blueBright(process.pid + "") + "]" :
        chalk.redBright("> Master") + "[" +
            chalk.blueBright(process.pid + "") + "]"; };
    if (cluster.isMaster) {
        // print logo if this process is a master process, e.g. the user console process
        printLogo();
        // print the handlers if the verbose switch is set
        if (args.options.verbose) {
            printHandlers(handlers, args.path);
        }
        // decide which amount of workers are required
        var workerCount = os.cpus().length;
        if (!args.options.cluster) {
            workerCount = 1;
        }
        else if (typeof args.options.cluster === "number") {
            workerCount = args.options.cluster;
        }
        // create a cluster master setting
        // -> invoke this cli with the necessary arguments
        cluster.setupMaster({
            args: ["start " + args.path + " -p " + port + " -h " + hostname],
            exec: __filename,
            silent: false,
        });
        // notify user that the master is set up
        console.log(xMasterTextIdent("run") + " is running (planning " +
            chalk.blueBright(workerCount + "") + " workers)");
        // create cluster forks (spawn worker processes)
        for (var i = 0; i < workerCount; i++) {
            cluster.fork();
        }
        // set an event-handler to detect if a worker exited
        // and (depending on the force switch) if the exited
        // worker needs restarting
        cluster.on("exit", function (worker, code, signal) {
            // notify the user that a worker exited
            console.log(xWorkerTextIdent("dead") + " stopped running");
            // spawn a new worker process if the force switch
            // is set
            if (args.options.force) {
                cluster.fork();
            }
        });
    }
    // create the server instance only if this process is a worker process
    if (cluster.isWorker) {
        // build a expressjs worker-app
        var worker = buildExpressJSStackFromHandlerList(handlers, express());
        // start the http server from the generated expressjs instance
        worker.listen(port, hostname, function () {
            console.log(xWorkerTextIdent("run") + " is running");
        });
    }
});
vorpal.delimiter("")
    .parse(process.argv);
//# sourceMappingURL=scirocco-cli.js.map