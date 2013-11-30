/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */
/*global console */

(function () {
    "use strict";
    
    var metadata = null;
    
    
    function getRefFromCode(src) {
        if (metadata === null) {
            return {};
        }
        
        console.log("the source is " + src);
        if (!metadata.hrCode.hasOwnProperty(src)) {
            return {};
        }
        
        return metadata.hrCode[src].refs;
    }
    
    function refreshReferences(projectDir) {
        console.log("The dir is " + projectDir);
        try {
            metadata = require(projectDir + "/dist/metadata.json");
        } catch(e) {
            console.log("No metadata found");
        }
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