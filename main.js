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
    
    
    function loadReferences(editor) {
        if (typeof editor === "undefined") {
            editor = EditorManager.getFocusedEditor();
        }
        
        console.log(editor.document.file.name);
        var project = ProjectManager.getProjectRoot();
        var l = project.fullPath.length;
        var openFile = editor.document.file.fullPath.substr(l);
        
        if (nodeDomainPromise === null) {
            return;
        }
        nodeDomainPromise.then(function(domain) {
            domain.refreshReferences(ProjectManager.getProjectRoot().fullPath);
            domain.getRefFromCode(openFile).then(function(ref){
                console.log(project.fullPath);
//                debugger;
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
                
                console.log(ref);
            });
        });
    }
    // Load the file references (if any) when a new editor comes into play
    $(EditorManager).on("activeEditorChange", function(event, newEditor){
        // This event is called both for full and inline editors, so
        // I need to only call it when is full.
        if (newEditor !== null && newEditor.isFullyVisible()) {
            loadReferences(newEditor);
        }
    });

    
    function openQuickEditReference(editor, ref) {
        var p = $.Deferred();
        
        var project = ProjectManager.getProjectRoot();
        var filePath = project.fullPath + ref.loc[0].file;
        
        var docP = DocumentManager.getDocumentForPath(filePath);

        docP.then(function (doc1) {
            var ranges = [];
            ranges.push({
                "name": ref.loc[0].file,
                "document": doc1,
                "lineStart": ref.loc[0].line - 5,
                "lineEnd": ref.loc[0].line + 5
            });
            
            var e = new MultiRangeInlineEditor(ranges);
            e.load(editor);
            p.resolve(e);
        });
        return p.promise();
    }
    
    function playWithQuickEdit(editor, location) {
        for (var refhash in references) {
            if (location.line < references[refhash].startPos.line ) {
                continue;
            }
            
            if (location.line > references[refhash].endPos.line ) {
                continue;
            }
            return openQuickEditReference(editor, references[refhash].ref);
        }
        return null;
        
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