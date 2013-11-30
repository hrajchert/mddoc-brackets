This file is in charge of bind stuff together.
TODO: Write this better and in the code as jsdoc, later on, import it here.

The function `loadReferences` receives an editor and loads the **code references** inside the various markdowns. Then it inserts gutters markers
next to the referenced code and stores the references in an object to allow the `cmd + K ` document search

{%code_inc
    "src" : "main.js",
    "ref" : {
        "text" : "function loadReferences(editor) {"
    }
%}