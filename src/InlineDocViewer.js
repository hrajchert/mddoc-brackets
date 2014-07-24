/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

define(function (require, exports) {
    "use strict";

    // Load dependent modules
    var InlineWidget       = brackets.getModule("editor/InlineWidget").InlineWidget,
        CommandManager     = brackets.getModule("command/CommandManager"),
        Commands           = brackets.getModule("command/Commands"),
        ProjectManager     = brackets.getModule("project/ProjectManager");


    /**
     *
     * @summary This is the inline widget, shown in quick docs (CMD+K).
     *
     * @desc
     *       It shows the rendered HTML of the markdown block that is associated with a code reference.
     *
     *       In other words, each code reference should have a markdown block associated that describes
     *       what the reference is all about, that block can be render in HTML. This widget, shows
     *       that HTML inlined in the code editor when the quick docs is activated.
     *
     *
     * @class
     * @extends {InlineWidget}
     * @alias   InlineDocViewer
     * @param   {String}        filename    The filename of the markdown file
     * @param   {integer}       lineno      The line number inside the markdown file of the asked reference
     * @param   {String}        content     The HTML content to show
     */
    var InlineDocViewer = function (filename, lineno, content) {
        InlineWidget.call(this);

        this.filename = filename;
        this.lineno   = lineno;
        this.content = content;
    };

    InlineDocViewer.prototype = Object.create(InlineWidget.prototype);
    InlineDocViewer.prototype.constructor = InlineDocViewer;
    InlineDocViewer.prototype.parentClass = InlineWidget.prototype;

    // Not sure if needed...
    InlineDocViewer.prototype.$wrapper = null;
    InlineDocViewer.prototype.$htmlHolder = null;
    InlineDocViewer.prototype.$header = null;
    InlineDocViewer.prototype.$title = null;



    /**
     * Event handler called once the widget is added in the parent editor
     */
    InlineDocViewer.prototype.onAdded = function () {
        InlineDocViewer.prototype.parentClass.onAdded.apply(this, arguments);

        // Adjust widget height to the HTML block height
        var widgetHeight = this.$wrapper.height();
        this.hostEditor.setInlineWidgetHeight(this, widgetHeight, true);
    };


    /**
     *  Entry point of the widget
     */
    InlineDocViewer.prototype.load = function () {
        var self = this;
        InlineDocViewer.prototype.parentClass.load.apply(this, arguments);

        // Create widget inner HTML structure
        this.$wrapper = $("<div/>").addClass("inline-html-show").appendTo(this.$htmlContent);
        this.$header = $("<div/>").addClass("inline-html-show-header").appendTo(this.$wrapper);
        this.$title = $("<a/>").addClass("title").appendTo(this.$header);
        this.$htmlHolder = $("<div/>").addClass("inline-html-show-holder").appendTo(this.$wrapper);

        // Set widget title
        var title = this.filename + " : " + this.lineno;
        this.$title.html(title);
        // Set content
        // TODO: Probably move the content loading here, check out InlineTextEditor:setInlineContent
        this.$htmlHolder.html(this.content);

        // clicking on the title jumps to full editor view
        this.$title.on("click", function () {
            // Construct the full path, including the linenumber
            var fullPath = ProjectManager.getProjectRoot().fullPath + self.filename + ":"+ self.lineno;

            // Open the file
            CommandManager.execute(Commands.FILE_ADD_TO_WORKING_SET, { fullPath: fullPath });
        });

    };

    exports.InlineDocViewer = InlineDocViewer;

});
