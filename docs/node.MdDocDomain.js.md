The method `refreshReferences` is currently analyzing (and rendering the html) for the whole project
TODO: Make it more performant and separated in the future

{%code_warning
    "src" : "node/MdDocDomain.js",
    "ref" : {
        "text" : "function refreshReferences(projectDir, cb) {"
    }
%}


This part of the code is doing a switch in promises. Im not exactly sure if this is what I want to do. I would
like to delete all previous fullfilled handlers, and re-resolve the metadata for pending or future handlers.
Basically say, you know the metadata you had, If you already used it, fine, but if not here is a new one for you.
I think that by switching the promise, we could be loosing the pending promises if the javascript turn hasnt finished
or some bug of some sort... Will have to check

{%code_warning
    "src" : "node/MdDocDomain.js",
    "ref" : {
        "text" : "metadataPromise.promise.inspect().state !== "
    }
%}

**Warning:**
This use case is showing the need to make a single entry point for references,
indexed by refhash
{:.alert .alert-danger }

{%code_warning
    "src" : "node/MdDocDomain.js",
    "ref" : {
        "text" : "for (var i = 0; i < metadata.hrMd[mdfile].refs.length ; i++) {"
    }
%}


**Warning:**
We shouldn't be using the helper method `renderMlBlock` inside the node domain code, instead, in the mddoc library we should
have a way to get the rendered HTML code and in here just proxy it.
As a downside, for example, we are accesing the metadata directly, and if that changes (it will), this code will blow.
{:.alert .alert-danger }

{%code_warning
    "src" : "node/MdDocDomain.js",
    "ref" : {
        "text" : "var renderMlBlock = require"
    }
%}
