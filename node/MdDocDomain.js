/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */
/*global console */

(function () {
    "use strict";

    var when  = require("when"),
        mdDoc = require("mdDoc"),
        fs    = require("fs");

    var metadata = null;


    /**
     * Gets the reference from a source file
     * @param string src The source file to get the reference from
     */
    function getRefFromCode(src) {
        // We need to have the metadata loaded before calling this.
        if (metadata === null) {
            return {};
        }

        // If we dont have metadata for this src file, nothing to see here, move along.
        if (!metadata.hrCode.hasOwnProperty(src)) {
            return {};
        }

        // If there is, show it!
        return metadata.hrCode[src].refs;
    }


    /**
     * @private
     * Loads a json file in form of a promise
     * @param   string  jsonFile The path of the json file to load
     * @returns Promise          A promise of the json object
     */
    function _loadJson(jsonFile) {
        var p = when.defer();
        fs.readFile(jsonFile, function(err, str) {
            if (err) {
                return p.reject(err);
            }

            try {
                var jsonParse = JSON.parse(str);
                p.resolve(jsonParse);
            } catch (e) {
                p.reject({msg: "Parsing error", file: jsonFile, err: e});
            }
        });
        return p.promise;
    }

    /**
     * Refreshes the metadata for the project
     * @param {type} projectDir Description
     */
    function refreshReferences(projectDir) {
        process.chdir(projectDir);
        var mddocSettings = _loadJson(projectDir + "/.mddoc.json");
        console.log(mddocSettings);
        mddocSettings.then(function(settings) {
            mdDoc.tool.verbose(false);
            mdDoc.tool.run(settings).then(function (promisedMetadata) {
                metadata = promisedMetadata;
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
            false,              // this command is synchronous
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
            false,              // this command is synchronous
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
