<html>
    <head>
        <link rel="stylesheet" href="http://yandex.st/highlightjs/7.3/styles/default.min.css" />
    </head>
    <body>
        <%- @documentor.getHtml 'index' %>
        <hr/>
        <%- @documentor.getHtml 'directory-structure' %>
        <hr/>
        <%- @documentor.getHtml 'main.js' %>


        <script src="http://yandex.st/highlightjs/7.3/highlight.min.js"></script>
        <script>hljs.initHighlightingOnLoad();</script>

    </body>
</html>