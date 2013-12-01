/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50, unparam: true */
/*jshint undef: true, unused: true */
/*global define, $, brackets */


define(function (require, exports, module) {
    "use strict";

    var EditorManager           = brackets.getModule("editor/EditorManager"),
        MultiRangeInlineEditor  = brackets.getModule("editor/MultiRangeInlineEditor").MultiRangeInlineEditor,
        ExtensionUtils          = brackets.getModule("utils/ExtensionUtils"),
        ProjectManager          = brackets.getModule("project/ProjectManager"),
        DocumentManager         = brackets.getModule("document/DocumentManager"),
        AppInit                 = brackets.getModule("utils/AppInit"),
        NodeConnection          = brackets.getModule("utils/NodeConnection");

    var GutterHelper = require("./GutterHelper");

    var nodeDomainPromise = null;
    ExtensionUtils.loadStyleSheet(module, "main.less");

    var references = {};


    function _getEditorRelativePath (editor) {
        var project = ProjectManager.getProjectRoot();
        var l = project.fullPath.length;
        return editor.document.file.fullPath.substr(l);
    }

    var loadedReferences = {};

    /**
     * Get the code references for `editor` and insert gutter markers next to the referenced code
     * @param editor editor Brackets editor object of the file we want to load the references to.
     */
    function loadReferences(editor) {
        // If no editor was provided, get the current one.
        if (typeof editor === "undefined") {
            editor = EditorManager.getFocusedEditor();
        }

        // Get the relative path to the project of the file we want to get the references
        var openFile = _getEditorRelativePath(editor);

        console.log("Loading references for: " + openFile);

        // TODO: fix this
        if (nodeDomainPromise === null) {
            return;
        }

        // Clear the previous references
        // TODO: Do I want to do this?
        references = {};
        GutterHelper.clearGutter(editor);

        // Ask for the node domain
        nodeDomainPromise.then(function(domain) {
            domain.getRefFromCode(openFile).then(function(ref){
                for (var refhash in ref) {
                    if (!ref[refhash].found) {
                        continue;
                    }
                    references[refhash] = {
                        ref: ref[refhash],
                        startPos: editor._codeMirror.posFromIndex(ref[refhash].char.from),
                        endPos: editor._codeMirror.posFromIndex(ref[refhash].char.to)
                    };
                    var line = references[refhash].startPos.line;
                    GutterHelper.createGutter({"line": line + 1});
                }
                loadedReferences[openFile] = true;

            });
        });
    }

    // Load the file references (if any) when a new editor comes into play
    $(EditorManager).on("activeEditorChange", function(event, newEditor){
        // This event is called both for full and inline editors, so
        // I need to only call it when is full.
        if (newEditor !== null && newEditor.isFullyVisible()) {
            var editorFileName = _getEditorRelativePath(newEditor);

            // Only load once the references for each file
            if (!loadedReferences.hasOwnProperty(editorFileName)) {
                loadReferences(newEditor);
            }

        }
    });

    // Whenever a document is saved we refresh the references of the whole project (IU PERFORMANCE!)
    $(DocumentManager).on("documentSaved", function(){
        console.log("Document saved!");
        nodeDomainPromise.then(function(domain) {
            domain.refreshReferences(ProjectManager.getProjectRoot().fullPath).then(function () {
                // Reset the loaded references
                loadedReferences = {};
                // Load reference for the current open file
                loadReferences();
            });
        });
    });

    function openQuickEditReference(editor, refs) {
        var p = $.Deferred();

        var projectPath = ProjectManager.getProjectRoot().fullPath;
        var documentPromises = [];
        for (var i = 0; i < refs.length ; i++) {
            var filePath = projectPath + refs[i].loc[0].file;
            documentPromises.push(DocumentManager.getDocumentForPath(filePath));
        }

        $.when.apply($, documentPromises).then( function() {
            var ranges = [];
            for (var i = 0; i < arguments.length ; i++ ) {
                ranges.push({
                    "name": refs[i].loc[0].file,
                    "document": arguments[i],
                    "lineStart": refs[i].loc[0].line - 5,
                    "lineEnd": refs[i].loc[0].line + 5
                });
            }
            var e = new MultiRangeInlineEditor(ranges);
            e.load(editor);
            p.resolve(e);

        });
        return p.promise();
    }

    function playWithQuickEdit(editor, location) {
        var refs = [];
        for (var refhash in references) {
            if (location.line < references[refhash].startPos.line ) {
                continue;
            }

            if (location.line > references[refhash].endPos.line ) {
                continue;
            }
            refs.push(references[refhash].ref);
            // TODO: Change this so that we return all posible matches

        }
        if (refs.length === 0) {
            return null;
        } else {
            return openQuickEditReference(editor, refs);
        }
    }

    EditorManager.registerInlineDocsProvider(playWithQuickEdit, 1);


    AppInit.appReady(function () {
        // Create a new node connection. Requires the following extension:
        // https://github.com/joelrbrandt/brackets-node-client
        var nodeConnection = new NodeConnection();

        // Every step of communicating with node is asynchronous, and is
        // handled through jQuery promises. To make things simple, we
        // construct a series of helper functions and then chain their
        // done handlers together. Each helper function registers a fail
        // handler with its promise to report any errors along the way.


        // Helper function to connect to node
        function connect() {
            var connectionPromise = nodeConnection.connect(true);
            connectionPromise.fail(function () {
                console.error("[brackets-mdDoc] failed to connect to node");
            });
            return connectionPromise;
        }

        // Helper function that loads our domain into the node server
        function loadDomain() {
            var p = $.Deferred();
            var path = ExtensionUtils.getModulePath(module, "node/MdDocDomain");
            var loadPromise = nodeConnection.loadDomains([path], true);
            loadPromise.then(function(){
                p.resolve(nodeConnection.domains.mdDoc);
            });
            loadPromise.fail(function (err) {
                console.log("[brackets-mdDoc] failed to load domain: " + err);
                p.reject(err);
            });
            return p.promise();
        }

        nodeDomainPromise = connect().then(loadDomain);
        loadReferences();
    });

// Function that shows me how to add a marker in brackets
//    function playWithMarker() {
//        var from = {line: 3, ch: 4};
//        var to = {line: 3, ch: 10};
//        var options = {inclusiveLeft: true, className: 'pepe'};
//
//        var editor = EditorManager.getFocusedEditor();
//        var cm = editor._codeMirror;
//        cm.markText(from, to, options);
//    }


//    exports.playWithGutter = playWithGutter;
});
