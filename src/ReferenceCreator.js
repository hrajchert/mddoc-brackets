/*global define, brackets*/
define(function (require, exports) {
    "use strict";

    var EditorManager           = brackets.getModule("editor/EditorManager"),
        DocumentManager         = brackets.getModule("document/DocumentManager"),
        MultiRangeInlineEditor  = brackets.getModule("editor/MultiRangeInlineEditor").MultiRangeInlineEditor,
        ProjectManager          = brackets.getModule("project/ProjectManager");


    var nodeDomainPromise = require("./DomainHelper").mdDocDomain,
        InlineDropdown = require("./InlineDropdown").InlineDropdown;


    var templates = {
        warning: require("text!snippets/warning_template.plain"),
        todo:    require("text!snippets/todo_template.plain")
    };

    var items = [{key: "warning", value: "Warning"}, {key:"todo", value: "To-Do"}];


    function countLines (text) {
        var lines = text.split("\n");
        return lines.length;
    }


    function _getEditorRelativePath (editor) {
        var project = ProjectManager.getProjectRoot();
        var l = project.fullPath.length;
        return editor.document.file.fullPath.substr(l);
    }

    function makeSureDocFileExists (path) {
        return nodeDomainPromise.then(function(domain){
            return domain.makeSureDocFileExists(path);
        });
    }

    function loadTemplate (editor, template) {
        var relativePath = _getEditorRelativePath(editor);
        var selection = editor.getSelection();
        var selected = editor.getSelectedText().replace("\"", "\\\"");


        makeSureDocFileExists(relativePath).then(function(filePath){
            DocumentManager.getDocumentForPath(filePath).done(function(document){
                var docLines  = countLines(document.getText());
                var tmplLines = countLines(template);
                // Insert the template
                var pos = {line: docLines + 1, ch: 0};


                var instance = template.replace("%%REF%%", selected)
                                       .replace("%%FILEPATH%%",  relativePath);
                document.replaceRange (instance, pos);
                var e = new MultiRangeInlineEditor([{
                    "name": "test test",
                    "document": document,
                    "lineStart": docLines - 1,
                    "lineEnd":  docLines + tmplLines

                }]);
                e.load(editor);
                editor.addInlineWidget(selection.start, e);
            });
        });

    }

    function chooseTemplate (onTemplateChoosed) {
        // See what is selected
        var editor = EditorManager.getCurrentFullEditor();


        // Check positions to add the dropdown to
        var cm = editor._codeMirror;
        var pos = editor.getCursorPos(true);
        // For some reason the dropdown appears one line below, probaby css stuff
        pos.line--;
        var coords = cm.cursorCoords(pos);


        var onSelect = function (selection) {
            var key = selection.attr("data-key");
            onTemplateChoosed(templates[key]);

        };
        new InlineDropdown({items: items, coords: coords}, onSelect);
    }


    function handleCreateRef () {
        var editor = EditorManager.getCurrentFullEditor();
        var selected = editor.getSelectedText();

        // If there is something selected choose template
        if (selected !== "") {
            chooseTemplate(function(template){
                loadTemplate(editor, template);
            });
        }
    }

    exports.handleCreateRef = handleCreateRef;
});
