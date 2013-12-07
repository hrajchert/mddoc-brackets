/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */
/*global console */

(function () {
    "use strict";

    var when  = require("when"),
        mdDoc = require("mdDoc"),
        fs    = require("fs");

    // This is a promise to get the metadata
    var metadataPromise = when.defer();

    /**
     * Gets the reference from a source file
     * @param string src       The source file to get the reference from
     * @param cb     function  The errback to call once we get the references
     */
    function getRefFromCode(src, cb) {
        // Wait for the metadata to be loaded
        metadataPromise.promise.then(function(metadata) {
            // If we dont have metadata for this src file, nothing to see here, move along.
            if (!metadata.hrCode.hasOwnProperty(src)) {
                return cb(null, {});
            }

            // If there is, show it!
            return cb(null, metadata.hrCode[src].refs);
        });

        // Catch errors
        metadataPromise.promise.otherwise(function(err) {
            cb(err);
        });
    }


    /**
     * @private
     * Helper method that loads a json file in form of a promise
     * @param   string  jsonFile The path of the json file to load
     * @returns Promise          A promise of the json object
     */
    function _loadJson(jsonFile) {
        var p = when.defer();
        // Try to read the file
        fs.readFile(jsonFile, function(err, str) {
            // Inform if it was any errors
            if (err) {
                return p.reject({msg: "Reading error", file: jsonFile, err: err});
            }

            // Try to parse the file as a json or fail otherwise
            try {
                var jsonParse = JSON.parse(str);
                p.resolve(jsonParse);
            } catch (e) {
                console.error("json failed " + jsonFile);
                p.reject({msg: "Parsing error", file: jsonFile, err: e});
            }
        });
        return p.promise;
    }

    /**
     * Refreshes the metadata for the project
     * @param string projectDir The path of the project to analyze
     * @param cb     function  The errback to call once we get the references
     */
    function refreshReferences(projectDir, cb) {
        // If the metadata is already resolved, then create a new one
        if (metadataPromise.promise.inspect().state !== "pending") {
            metadataPromise = when.defer();
        }

        // Change to the project dir to simulate the tool being run there
        process.chdir(projectDir);

        // Load the project settings
        var mddocSettings = _loadJson(projectDir + "/.mddoc.json");

        // Run the tool
        mddocSettings.then(function(settings) {
            mdDoc.tool.verbose(false);
            mdDoc.tool.run(settings).then(function (metadata) {
                metadataPromise.resolve(metadata);
                cb(null, metadata);
            }, function(err) {
                cb(err);
            });
        });
    }

    /**
     * Initializes the test domain with several test commands.
     * @param {DomainManager} DomainManager The DomainManager for the server
     */
    function init(DomainManager) {
        if (!DomainManager.hasDomain("mdDoc")) {
            DomainManager.registerDomain("mdDoc", {major: 0, minor: 1});
        }

        DomainManager.registerCommand(
            "mdDoc",            // domain name
            "refreshReferences",   // command name
            refreshReferences,     // command handler function
            true,              // this command is asynchronous
            "To complete",
            [{name: "dir",
              type: "dir:string",
              description: "The directory of the project"
             }],                 // no parameters
            []
        );


        DomainManager.registerCommand(
            "mdDoc",            // domain name
            "getRefFromCode",   // command name
            getRefFromCode,     // command handler function
            true,              // this command is asynchronous
            "To complete",
            [{name: "src",
              type: "src:string",
              description: "The source file to read"
             }],                 // no parameters
            []
        );
    }

    exports.init = init;

}());
