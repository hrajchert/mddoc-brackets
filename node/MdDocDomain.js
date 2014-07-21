/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */

(
/**
 * This module connects the brackets plugin with the mddoc node library
 * @exports node/MdDocDomain
 */
function () {
    "use strict";

    var when  = require("when"),
        mddoc = require("mdDoc"),
        config = mddoc.config;

    /**
     * This is a promise to get the metadata
     * @type {Promise}
     */
    var metadataPromise = when.defer();

    /**
     * Gets the reference from a source file
     * @param {String}  src       The source file to get the reference from
     * @param cb        cb        The errback to call once we get the references
     */
    function getRefFromCode(src, cb) {
        // Wait for the metadata to be loaded
        metadataPromise.promise.done(
            function(metadata) {

                // If we dont have metadata for this src file, nothing to see here, move along.
                if (metadata === null || !metadata.hrCode.hasOwnProperty(src)) {
                    return cb(null, {});
                }
                // If there is, show it!
                return cb(null, metadata.hrCode[src].refs);
            },
            // Catch errors
            function(err) {
                cb(err);
            }
        );
    }

    // TODO: Move logic to mddoc
    var renderMlBlock = require("mdDoc/src/generator/GeneratorHelperManager").renderMlBlock;

    /**
     * @summary Gets the rendered HTML of the markdown block that is asociated with the reference.
     *
     * @desc    Given a code reference (described by the markdown file and the line number where its located)
     *          find the markdown block or blocks and render its HTML, ready to be shown by the
     *          {@link module:main~openQuickViewReference|openQuickViewReference }
     *
     * @param  {String}    mdfile   The markdown file of the reference
     * @param  {Integer}   line     The linenumber in the markdown file that holds the reference
     * @return {String}             The rendered HTML
     */
    function getReferencingMlHtml (mdfile, line, cb) {
        metadataPromise.promise.then(function(metadata) {
            // If we dont have metadata for this src file, something went wrong
            if (!metadata.hrMd.hasOwnProperty(mdfile)) {
                return cb("Md file not found: " + mdfile);
            }
            var ref = null;
            // Find the reference in mdfile by line number
            for (var i = 0; i < metadata.hrMd[mdfile].refs.length ; i++) {
                var refI = metadata.hrMd[mdfile].refs[i];

                if (refI.lineNumber === line) {
                    ref = refI;
                    break;
                }
            }

            if (ref === null) {
                return cb("Reference not found");
            }
            // Get the markdown block, asociated with the reference
            var referencingJsonMl = ref.refMl;
            if (referencingJsonMl === null) {
                return cb(null, "NO BLOCK ATTACHED");
            }
            var jsonML = ["markdown", referencingJsonMl];

            return cb(null, renderMlBlock(jsonML));
        });
    }

    /**
     * Get the references that weren't found
     * @return {Array}      The "not found" references
     */
    function getNotFoundRefs(cb) {
        // Wait for the metadata to be loaded
        metadataPromise.promise.then(function() {
            console.log("getNotFoundRefs called");

            console.log(mddoc.getMetadataManager());

            var ref = mddoc.getMetadataManager().getNotFoundList();

            console.log(ref);
            // Return the not found references
            return cb(null, ref);
        });

        // Catch errors
        metadataPromise.promise.otherwise(function(err) {
            cb(err);
        });

    }


    /**
     * Refreshes the metadata for the project
     * @param {string}  projectDir The path of the project to analyze
     * @param {Errback} cb         The errback to call once we get the references
     */
    function refreshReferences(projectDir, cb) {
        console.log("refreshing references");
        // If the metadata is already resolved, then create a new one
        if (metadataPromise.promise.inspect().state !== "pending") {
            console.log("creating a new promise, old was ",metadataPromise.promise.inspect().state);
            metadataPromise = when.defer();
        }

        // Change to the project dir to simulate the tool being run there
        // TODO: Move this to the tool inside a configuration
        process.chdir(projectDir);

        // Load the project settings
        var mddocSettings = config.loadConfig(projectDir);

        // Run the tool
        mddocSettings.done(
            function(settings) {
                mddoc.verbose(false);
                mddoc.initialize(settings);

                var steps = [
                    mddoc.readMarkdown,
                    mddoc.readCode
                ];

                mddoc.run(steps).then(function (metadata) {
                    metadataPromise.resolve(metadata);
                    cb(null, metadata);
                }, function(err) {
                    cb(err);
                });
            },
            // If we could not load the settings, there is no problem
            function(err) {
                console.log("could not load the settings?", err);
                metadataPromise.resolve(null);
                // TODO: distinguish between configuration error and configuration file not found
                cb(null, null);
            }
        );
    }

    /**
     * Initializes the domain
     * @param {DomainManager} DomainManager The DomainManager for the server
     */
    exports.init = function (DomainManager) {
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

        DomainManager.registerCommand(
            "mdDoc",            // domain name
            "getNotFoundRefs",   // command name
            getNotFoundRefs,     // command handler function
            true,              // this command is asynchronous
            "To complete",
            [],                 // no parameters
            []
        );

        DomainManager.registerCommand(
            "mdDoc",            // domain name
            "getReferencingMlHtml",   // command name
            getReferencingMlHtml,     // command handler function
            true,              // this command is asynchronous
            "To complete",
            [{name: "mdfile",
              type: "src:string",
              description: "The md file that has the reference"
             },
             {name: "line",
              type: "src:string",
              description: "The line number in that file that should have the reference"
             }
            ],                 // no parameters

            []
        );
    };


})();
