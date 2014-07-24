/*global define, brackets, window, $ */
define(function (require, exports) {
    "use strict";

    var DropdownEventHandler    = brackets.getModule("utils/DropdownEventHandler").DropdownEventHandler,
        Menus                   = brackets.getModule("command/Menus");

    var InlineDropdown = function(options, onSelect, onClose) {
        var items = options.items;
        var coords = options.coords;
        this.onCloseHandler = onClose;

        Menus.closeAll();

        var $newMenu = $("<li class='dropdown context-menu open'></li>"),
              $popUp = $("<ul class='dropdown-menu dropdownbutton-popup' tabindex='-1'></ul>");

        this.$newMenu = $newMenu;

        // assemble the menu fragments
        $newMenu.append($popUp);

        $newMenu.css({
            left: coords.left,
            top: coords.top
        });

        // insert into DOM
        // TODO: Probably add this to body and when its close remove it.
        $("#context-menu-bar > ul").append($newMenu);

        // Create the elements
        items.forEach(function(item) {
            $popUp.append("<li><a data-key='"+item.key+"'>" + item.value +"</a></li>");
        });

        // We need to store the binded handler if we want to remove it later
        this._onClickOutside = this._onClickOutside.bind(this);
        this._onClose = this._onClose.bind(this);

        window.document.body.addEventListener("mousedown", this._onClickOutside, true);

        //
        this._lastFocus = window.document.activeElement;
        $popUp.focus();


        this._dropdownEventHandler = new DropdownEventHandler($popUp, onSelect , this._onClose);
        this._dropdownEventHandler.open();
        // This method is private, but I need it to set the first element
        this._dropdownEventHandler._setSelectedIndex(0, true);
    };

    InlineDropdown.prototype._onClickOutside = function (event) {
        console.log("mouse down!");
        var $container = $(event.target).closest(".context-menu");
        console.log($container[0]);
        console.log(this.$newMenu[0]);

        // If click is outside dropdown list or dropdown button, then close dropdown list
        if ($container.length === 0 || $container[0] !== this.$newMenu[0]) {
            this.closeDropdown();
            event.stopPropagation();
            event.preventDefault();
        }

    };

    // This executes every time the dropdown actually closes
    InlineDropdown.prototype._onClose = function() {
        console.log("on close");
        // Restore focus
        this._lastFocus.focus();
        // Release event listeners
        window.document.body.removeEventListener("mousedown", this._onClickOutside, true);
        if (this.onCloseHandler) {
            this.onCloseHandler();
        }
    };

    InlineDropdown.prototype.closeDropdown = function () {
        if (this._dropdownEventHandler) {
            this._dropdownEventHandler.close();
        }
    };


    exports.InlineDropdown = InlineDropdown;

});
