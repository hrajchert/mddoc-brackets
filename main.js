/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50, unparam: true */
/*jshint undef: true, unused: true */
/*global define, $, brackets */

define(
    /**
     * This is the entry point of the plugin. It's in charge of binding the plugin specific stuff.
     * @exports main
     */
    function (require, exports, module) {
    "use strict";

    var EditorManager           = brackets.getModule("editor/EditorManager"),
        MultiRangeInlineEditor  = brackets.getModule("editor/MultiRangeInlineEditor").MultiRangeInlineEditor,
        ExtensionUtils          = brackets.getModule("utils/ExtensionUtils"),
        ProjectManager          = brackets.getModule("project/ProjectManager"),
        DocumentManager         = brackets.getModule("document/DocumentManager"),
        CommandManager          = brackets.getModule("command/CommandManager"),
        Menus                   = brackets.getModule("command/Menus");

    var GutterHelper      = require("./GutterHelper");
    var nodeDomainPromise = require("./DomainHelper").mdDocDomain;
    var PanelHelper       = require("./PanelHelper");
    var InlineDocViewer   = require("./InlineDocViewer").InlineDocViewer;


    ExtensionUtils.loadStyleSheet(module, "main.less");


    function _getEditorRelativePath (editor) {
        var project = ProjectManager.getProjectRoot();
        var l = project.fullPath.length;
        return editor.document.file.fullPath.substr(l);
    }

    // This are the references cached.
    // The keys correspond to the files that where cached, the values will be other object with the references.
    var references = {};


    /**
     * Get the code references for `editor` and insert gutter markers next to the referenced code
     * @param editor editor Brackets editor object of the file we want to load the references to.
     */
    function loadReferences(editor) {
        // If no editor was provided, get the current one.
        if (editor === null || typeof editor === "undefined") {
            editor = EditorManager.getFocusedEditor();
        }

        // Get the relative path to the project of the file we want to get the references
        var openFile = _getEditorRelativePath(editor);

        // Ask for the node domain
        nodeDomainPromise.then(function(domain) {
            console.log("Loading references for: " + openFile);

            // Clear the previous references
            references[openFile] = {};
            GutterHelper.clearGutter(editor);

            domain.getRefFromCode(openFile).then(function(ref){
                for (var refhash in ref) {
                    if (!ref[refhash].found) {
                        continue;
                    }
                    references[openFile][refhash] = {
                        ref: ref[refhash],
                        startPos: editor._codeMirror.posFromIndex(ref[refhash].char.from),
                        endPos: editor._codeMirror.posFromIndex(ref[refhash].char.to)
                    };
                    var line = references[openFile][refhash].startPos.line;

                    // TODO: refactor
                    var opts = {"line": line + 1};
                    if (ref[refhash].directive === "code_warning") {
                        opts.className = "mdDoc-warning";
                        opts.letter = "W";
                    } else if (ref[refhash].directive === "code_todo") {
                        opts.className = "mdDoc-todo";
                        opts.letter = "T";
                    }
                    GutterHelper.createGutter(opts);
                }

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
            if (!references.hasOwnProperty(editorFileName)) {
                loadReferences(newEditor);
            }

        }
    });

    // When the project changes, refresh the metadata
    $(ProjectManager).on("projectOpen", function(){
        console.log("Project opened!");
        refreshReferences();
    });

    function refreshReferences () {
        nodeDomainPromise.then(function(domain) {
            domain.refreshReferences(ProjectManager.getProjectRoot().fullPath).then(
                function () {
                    // Reset the loaded references
                    references = {};
                    // Load reference for the current open file
                    loadReferences();
                    // Indicate there where no errors
                    PanelHelper.clearErrors();

                    // Refresh not found references
                    domain.getNotFoundRefs().then(PanelHelper.setNotFound);
                },
                function (err) {
                    console.log("there was an error");
                    console.log(err);
                    PanelHelper.showErrors(err);
                }
            );
        });
    }

    // Whenever a document is saved we refresh the references of the whole project (IU PERFORMANCE!)
    $(DocumentManager).on("documentSaved", function(){
        console.log("Document saved!");
        refreshReferences();
    });


    /**
     * Function that compares to references and helps sorts by the most specific.
     * The most specific reference is the one with lower line span
     * @param {type} ref1 The first reference to compare
     * @param {type} ref2 The second reference to compare
     * @private
     */
    function _sortMoreSpecific(ref1, ref2) {
        var size1 = ref1.char.to - ref1.char.from;
        var size2 = ref2.char.to - ref2.char.from;

        if (size1 === size2) {
            return 0;
        }
        if (size1 < size2 ) {
            return -1;
        }
        return 1;
    }

    /**
     * Open an inline editor to the documentation "source file" of a code reference.
     *
     * @param {Editor}    editor    The editor where the inline widget is going to be inserted
     * @param {array}     refs      The references
     */
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


    /**
     * Open an inline widget that shows the rendered HTML documentation of a code reference
     *
     * @param {Editor}    editor    The editor where the inline widget is going to be inserted
     * @param {array}     refs      The references
     */
    function openQuickViewReference(editor, refs) {
        var p = $.Deferred();
        nodeDomainPromise.then(function(domain) {
            // Note that we are taking the first reference, which is the closest one to
            // where the quick docs was pressed
            domain.getReferencingMlHtml(refs[0].loc[0].md, refs[0].loc[0].line ).then(
                function(html) {
                    var e = new InlineDocViewer(refs[0].loc[0].file, refs[0].loc[0].line, html);
                    e.load(editor);
                    p.resolve(e);
                }
            );
        });
        return p.promise();
    }

    var _editOnQuickHandle = false;

    /**
     * @summary Method that handles the Quick Docs (CMD+K) Event.
     * @desc
     *          This handler is responsable of detecting if there is a relevant code reference where the
     *          cursor was pressed, and if so, show an inline viewer to either show or edit the reference
     *
     * @param {Editor}                     editor    The current open editor, where the event was triggered
     * @param {{line:number, ch:number}}   location  The cursor location inside the open editor where the event
     *                                               was triggered
     */
    function quikDocsHandler(editor, location) {
        // This will hold the references that encloses the cursor
        var refs = [];

        // Get the references for the file that is currently being
        // edited
        var openFileName = _getEditorRelativePath(editor);
        var openFileReferences = references[openFileName];

        // Go trough the references and add the ones that encloses the cursor
        for (var refhash in openFileReferences) {
            if (location.line < openFileReferences[refhash].startPos.line ) {
                continue;
            }

            if (location.line > openFileReferences[refhash].endPos.line ) {
                continue;
            }
            refs.push(openFileReferences[refhash].ref);
        }
        // If there where no enclosing references, nothing to do here
        if (refs.length === 0) {
            return null;
        }
        // If not, open an inline widget to either show it or edit them
        else {
            // Sort the references by the most specific, so that you get the most relevant one.
            refs.sort(_sortMoreSpecific);
            if (_editOnQuickHandle) {
                return openQuickEditReference(editor, refs);
            } else {
                return openQuickViewReference(editor, refs);
            }
        }
    }

    EditorManager.registerInlineDocsProvider(quikDocsHandler, 1);


    // Register command to switch between show and edit
    var CMD_SWITCH_VIEW_EDIT = "mddoc.switchViewEdit";

    function handleSwitchViewEdit() {
        _editOnQuickHandle = !_editOnQuickHandle;
        CommandManager.get(CMD_SWITCH_VIEW_EDIT).setChecked(_editOnQuickHandle);
    }

    // Register the command
    CommandManager.register("Edit MdDoc on quick docs", CMD_SWITCH_VIEW_EDIT, handleSwitchViewEdit);

    // Set initial checked or not
    CommandManager.get(CMD_SWITCH_VIEW_EDIT).setChecked(_editOnQuickHandle);

    // Add a menu bar to control it
    var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
    menu.addMenuDivider();
    menu.addMenuItem(CMD_SWITCH_VIEW_EDIT,"Ctrl-B");




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
