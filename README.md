Swiffer
=======
Clean up your Dust

Summary
=======
Swiffer is a command line tool with IDE integration that helps you keep your dust clean. It warns about Dust parse errors, then checks any set of rules defined using the Swiffer DSL (see below).

How it works:
=============
Swiffer uses Dust's dust.parse to create an Abstract Syntax Tree (AST) of the given Dust template. If there are any errors, Swiffer displays these then exits. If the template is successfully parsed, Swiffer walks the AST and checks all applicable rules for each node of the tree.

DSL examples:
===========
```
{
  "name": "ifDeprecation",
  "description": "The @if creates a security hole and should be repalced by @eq, @gt, @lt, etc.",
  "target": {
    "type": "@if"
  },
  "rule": {
    "exists": {
      "message": "The @if creates a security hole and should be repalced by @eq, @gt, @lt, etc."
    }
  }
}
```
