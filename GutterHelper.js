/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50, unparam: true */
/*jshint undef: true, unused: true */
/*global define,  brackets, document */
define(function (require, exports) {
    "use strict";

    var EditorManager = brackets.getModule("editor/EditorManager");

    function makeMarker(options) {
        var className = options.className || "mdDoc-ref";
        var letter = options.letter || "D";
        var marker = document.createElement("div");
        marker.className = "mdDoc-gutter " + className;
        marker.innerHTML = letter;
        return marker;
    }

    function validateCodeMirrorGutter (cm) {
        var gutters = cm.getOption("gutters").splice(0);
        if ( gutters.indexOf("CodeMirror-mdDocGutter") === -1) {
            gutters.unshift("mdDocGutter");
            cm.setOption("gutters", gutters);
        }
    }

    function createGutter(options) {
        if (!options.hasOwnProperty("line")) {
            throw "Line needs to be specified";
        }

        // If we dont have an editor passed in, then we use the focused one
        if (!options.hasOwnProperty("editor")) {
            options.editor = EditorManager.getFocusedEditor();
        }

        var cm = options.editor._codeMirror;

        // Make sure we have the mdDocGutter defined for this document
        validateCodeMirrorGutter(cm);

        // Add the gutter for the selected line
        cm.setGutterMarker(options.line - 1, "mdDocGutter", makeMarker(options));
    }

    function clearGutter (editor) {
        var cm = editor._codeMirror;
        cm.clearGutter("mdDocGutter");
    }

    exports.createGutter = createGutter;

    exports.clearGutter = clearGutter;
});
