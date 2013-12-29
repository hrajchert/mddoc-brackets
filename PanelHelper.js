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

    var panelTemplate         = require("text!bottom-panel.html"),
        errorPanelTemplate    = require("text!_error-panel.html"),
        notFoundPanelTemplate = require("text!_not-found-panel.html");
    var $panel;
    var $statusBar;

    // Keeps track if the panel is open or not
    var _open = false;

    // If not told otherwise, the panel should open when there is something new to show
    var _openOnUpdate = true;


    /**
     * Shows the bottom panel
     */
    function showPanel(panelId) {
        _open = true;
        Resizer.show($panel);
        if (panelId !== undefined) {
            $("."+panelId).tab("show");
        }
    }


    /**
     * Hides the bottom panel
     */
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
        // Clear previous errors from the tab
        $("#mddoc-error").html("");

        // Hide the bottom panel
        hidePanel();

        // Inform there is no errors in the status bar
        StatusBar.updateIndicator("status-mddoc", true, "mddoc-success", "Systems are operational.");
    }

    /**
     * Parse and render the errors in the error tab of the bottom panel.
     * @param [Object] errors An array of error objects
     */
    function showErrors (errors) {
        // Make sure its an array
        if (!Array.isArray(errors)) {
            errors = [errors];
        }

        // Make the errors uniform, so we can pass it to the template system
        errors = _preprocessErrors(errors);

        // Render the errors using Mustache template system
        var errorPanel = Mustache.render(errorPanelTemplate, {errors:errors});

        // Insert the generated html in the error tab
        $("#mddoc-error").html(errorPanel);

        // Mark there is an error in the status bar
        StatusBar.updateIndicator("status-mddoc", true, "mddoc-error", "There is an error with the docs.");

        // Show the panel (only if we are not told otherwise)
        if (_openOnUpdate) {
            showPanel("mddoc-error");
        }

    }

    function _openLocationFromElement(e) {
        // Get the filename and number
        var filename = $(e.currentTarget).find(".filename").text();
        var linenumber = $(e.currentTarget).find(".linenumber").text();

        // Construct the full path, including the linenumber
        var fullPath = ProjectManager.getProjectRoot().fullPath + filename + ":"+linenumber;

        // Open the file
        CommandManager.execute(Commands.FILE_ADD_TO_WORKING_SET, { fullPath: fullPath });
    }

    /**
     * Sets the not found references and display the panel if needed
     */
    function setNotFound (notFoundRef) {
//        debugger;
        // Convert the not found map into a list of ref
        var refs = [];
        for (var refhash in notFoundRef) {
            // Stringify the query
            notFoundRef[refhash].query = JSON.stringify(notFoundRef[refhash].query, null, "    ");
            refs.push(notFoundRef[refhash]);
        }
        // Render the references using Mustache template system
        var notFoundPanel = Mustache.render(notFoundPanelTemplate, {refs:refs});

        // Insert the generated html in the error tab
        $("#mddoc-not-found").html(notFoundPanel);

        if (refs.length > 0 ) {
            // Mark there are not found references in the status bar
            StatusBar.updateIndicator("status-mddoc",
                                      true,
                                      "mddoc-not-found",
                                      "There are references that where not found.");

            // Show the panel (only if we are not told otherwise)
            if ( _openOnUpdate) {
                showPanel("mddoc-not-found");
            }
        }


    }

    AppInit.htmlReady(function () {
        // Create bottom panel to list error details
        var panelHtml = Mustache.render(panelTemplate, {});
        PanelManager.createBottomPanel("mddoc", $(panelHtml), 100);
        $panel = $("#mddoc-panel");

        $panel.on("click", ".close", function () {
            hidePanel();
            // If we manually close the panel, we shouldnt open it
            // automatically when there is a new event (like a new error)
            _openOnUpdate = false;
        });


        configureTabs();

        var statusIconHtml = Mustache.render("<div id=\"status-mddoc\">MdDoc</div>", {});
        $(statusIconHtml).insertAfter("#status-language");
        $statusBar = $("#status-mddoc");

        StatusBar.addIndicator("status-mddoc", StatusBar);


        // If we click on the status bar, then we should toggle the bottom panel
        $statusBar.on("click", function(){
            // Reset the open on events.
            _openOnUpdate = true;
            togglePanel();
        });

        // Whenever an error location is clicked, open the file that generates the error.
        $panel.on("click", "#mddoc-error .locations .loc",  _openLocationFromElement);

        $panel.on("click", "#mddoc-not-found .locations .loc",  _openLocationFromElement);
    });

    exports.showErrors = showErrors;
    exports.clearErrors = clearErrors;
    exports.showPanel = showPanel;
    exports.hidePanel = hidePanel;
    exports.togglePanel = togglePanel;
    exports.setNotFound = setNotFound;

});
