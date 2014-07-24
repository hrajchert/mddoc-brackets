This file is in charge of bind stuff together.
TODO: Write this better and in the code as jsdoc, later on, import it here.

The method `loadReferences` is called when the editor is changed, then it loads the references and insert gutters markers
next to the referenced code.

It also stores the references in the `references object` to allow the `cmd + K ` command that provides document search

{%code_inc
    "src" : "main.js",
    "referingBlocks" : 3,
    "ref" : {
        "text" : "function loadReferences(editor) {"
    }
%}



