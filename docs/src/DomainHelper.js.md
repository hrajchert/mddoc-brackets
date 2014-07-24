This code should be this:

    mdDocDomainPromise.resolve(connect().then(loadDomain));

But for some reason, the resolve on a "jQuery then method" is giving me the promise of the domain as an answer
instead of the domain itself. Thats why I had to add what I think it is, an unecesary annon function

{%code_inc
    "src" : "src/DomainHelper.js",
    "ref" : {
        "text" : "connect().then(loadDomain).then(function(a){"
    }
%}
