This file is in charge of bind stuff together.
TODO: Write this better and in the code as jsdoc, later on, import it here.

The method `loadReferences` is called when the editor is changed, then it loads the references and insert gutters markers
next to the referenced code.

It also stores the references in the `references object` to allow the `cmd + K ` command that provides document search

{%code_inc
    "src" : "main.js",
    "ref" : {
        "text" : "function loadReferences(editor) {"
    }
%}


This code is wrong because the promise should be loaded anyway. This will be fixed once I move the domain into its own helper file

{%code_ref
    "src" : "main.js",
    "ref" : {
        "text" : "if (nodeDomainPromise === null) {"
    }
%}


