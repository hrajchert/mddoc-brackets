The method `refreshReferences` is currently analyzing (and rendering the html) for the whole project
TODO: Make it more performant and separated in the future

{%code_ref
    "src" : "node/MdDocDomain.js",
    "ref" : {
        "text" : "function refreshReferences(projectDir) {"
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
