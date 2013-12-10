/*global define, Mustache, brackets, $ */
define(function (require, exports) {
    "use strict";

    var PanelManager            = brackets.getModule("view/PanelManager"),
        AppInit                 = brackets.getModule("utils/AppInit"),
        StatusBar               = brackets.getModule("widgets/StatusBar"),
        CommandManager          = brackets.getModule("command/CommandManager"),
        Commands                = brackets.getModule("command/Commands"),
        ProjectManager          = brackets.getModule("project/ProjectManager"),
        Resizer                 = brackets.getModule("utils/Resizer");

    var panelTemplate      = require("text!bottom-panel.html");
    var errorPanelTemplate = require("text!_error-panel.html");
    var $panel;
    var $statusBar;

    var _open = false;

    function showPanel() {
        _open = true;
        Resizer.show($panel);
    }

    function hidePanel() {
        _open = false;
        Resizer.hide($panel);
    }

    function togglePanel() {
        if ( _open ) {
            hidePanel();
        } else {
            showPanel();
        }
    }

    function configureTabs() {
        $panel.on("click", ".nav-tabs a", function (e) {
            e.preventDefault();
            $(this).tab("show");
        });

    }

    function _getLocationsFromCodeReaderError(error) {
        var locations = [];
        if ("err" in error && "reader" in error.err && "references" in error.err.reader) {
            Object.keys(error.err.reader.references).forEach(function(r) {
                var ref = error.err.reader.references[r];
                for (var i = 0; i < ref.loc.length ; i++) {
                    var loc = {
                        file: ref.loc[i].file,
                        line: ref.loc[i].line,
                    };
                    locations.push(loc);
                }
            });
        }
        return locations;
    }

    function _getErrorMessageFromSubErr(errObj, newError) {
        if (typeof errObj === "object") {
            if ("err" in errObj) {
                return _getErrorMessageFromSubErr(errObj.err, newError);
            }
            if ("stack" in errObj) {
                newError.stack = errObj.stack;
            }
            if ("msg" in errObj) {
                newError.msg = errObj.msg;
            } else {
                newError.msg = JSON.stringify(errObj, null, "    ");
            }

        } else {
            newError.msg = errObj.toString();
        }
    }

    function _preprocessErrors (errors) {
        var processedErrors = [];
        for (var i=0; i< errors.length ; i++) {
            var newError = {};
            var oldError = errors[i];

            if (typeof oldError === "string") {
                oldError = {msg: oldError};
            }

            if ("step" in oldError) {
                newError.step = oldError.step;
            } else {
                newError.step = "undefined step (weird)";
            }

            if ("msg" in oldError) {
                newError.msg = oldError.msg;
            } else if ("err" in oldError) {
                _getErrorMessageFromSubErr(oldError.err, newError);
            } else {
                newError.msg = "undefined error message";
            }

            if (newError.step === "code reader") {
                newError.location = _getLocationsFromCodeReaderError(oldError);
            }

            processedErrors.push(newError);
        }
        return processedErrors;
    }

    function clearErrors() {
        $("#mddoc-error").html("");
        hidePanel();
    }

    function showErrors (errors) {
        if (!Array.isArray(errors)) {
            errors = [errors];
        }

        errors = _preprocessErrors(errors);
        var errorPanel = Mustache.render(errorPanelTemplate, {errors:errors});
        $("#mddoc-error").html(errorPanel);
        showPanel();
    }

    function _configureShowErrorHandlers() {
        // Whenever an error location is clicked, open the file that generates the error.
        $panel.on("click", "#mddoc-error .locations .loc", function(e) {
            // Get the filename and number
            var filename = $(e.currentTarget).find(".filename").text();
            var linenumber = $(e.currentTarget).find(".linenumber").text();

            // Construct the full path, including the linenumber
            var fullPath = ProjectManager.getProjectRoot().fullPath + filename + ":"+linenumber;

            // Open the file
            CommandManager.execute(Commands.FILE_ADD_TO_WORKING_SET, { fullPath: fullPath });
        });
    }

    AppInit.htmlReady(function () {
        // Create bottom panel to list error details
        var panelHtml = Mustache.render(panelTemplate, {});
        PanelManager.createBottomPanel("mddoc", $(panelHtml), 100);
        $panel = $("#mddoc-panel");

        $panel.on("click", ".close", function () {
            Resizer.hide($panel);
        });


        configureTabs();

        var statusIconHtml = Mustache.render("<div id=\"status-mddoc\">MdDoc</div>", {});
        $(statusIconHtml).insertAfter("#status-language");
        $statusBar = $("#status-mddoc");

        StatusBar.addIndicator("status-mddoc", StatusBar);
        StatusBar.updateIndicator("status-mddoc", true, "myclass", "EA ea");

        $statusBar.on("click", togglePanel);

        _configureShowErrorHandlers();
    });

    exports.showErrors = showErrors;
    exports.clearErrors = clearErrors;

});
