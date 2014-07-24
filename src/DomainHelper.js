/*global define, $, brackets */


define(function (require, exports, module) {
    "use strict";

    var ExtensionUtils          = brackets.getModule("utils/ExtensionUtils"),
        AppInit                 = brackets.getModule("utils/AppInit"),
        NodeConnection          = brackets.getModule("utils/NodeConnection");


    var mdDocDomainPromise = $.Deferred();


    AppInit.appReady(function () {
        // Create a new node connection.
        var nodeConnection = new NodeConnection();

        // This method connects to the node process
        function connect() {
            // Try to connect
            var connectionPromise = nodeConnection.connect(true);
            // Log if it fail
            connectionPromise.fail(function () {
                console.error("[brackets-mdDoc] failed to connect to node");
            });
            // Return the promise of a connection
            return connectionPromise;
        }

        // Helper function that loads our domain into the node server
        // Returns a promise of the mdDoc domain
        function loadDomain() {
            var p = $.Deferred();
            var path = ExtensionUtils.getModulePath(module, "node/MdDocDomain");
            // Create a promise of the domain we want to load
            var loadPromise = nodeConnection.loadDomains([path], true);
            // Once the domain is loaded resolve the returned promise with the actual domain
            loadPromise.then(function(){
                p.resolve(nodeConnection.domains.mdDoc);
            });
            // Log if err
            loadPromise.fail(function (err) {
                console.log("[brackets-mdDoc] failed to load domain: " + err);
                p.reject(err);
            });
            return p.promise();
        }

        // The promise to export is resolved once we connect and later on load the mdDoc Domain.
        connect().then(loadDomain).then(function(a){
            mdDocDomainPromise.resolve(a);
        });
    });

    exports.mdDocDomain = mdDocDomainPromise.promise();
});
