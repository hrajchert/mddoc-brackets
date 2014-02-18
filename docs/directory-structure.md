# Directory structure

TODO: This should probably be using a dox plugin to get the file entry doc as the file descriptor.

* **main.js**: The main file, its in charge of binding the plugin specific stuff.
* **GutterHelper.js**: It's a helper to abstract the creation of a gutter marker on the left of the editor
* **node/MdDocDomain.js**: It's the connection file between this plugin and the mdDoc library.
* **docs/**: The folder that contains both the markdown that generates this documentation and the template files to compile them
* **dist/**: The destination folder where the compiled documentation goes to
* **.mddoc.json**: The configuration file, that coordinates how the documentations is generated.

{%code_ref
    "src": "main.js",
    "ref" : {
        "line" : "1-1"
    }
%}

{%code_ref
    "src": "GutterHelper.js",
    "ref" : {
        "line" : "1-1"
    }
%}

{%code_ref
    "src": "node/MdDocDomain.js",
    "ref" : {
        "line" : "1-1"
    }
%}

TODO: Let the source code reference .json or .md files by not adding esprima by default and all that jazz
