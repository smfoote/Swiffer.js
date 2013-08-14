Swiffer
=======
Clean up your Dust

Summary
=======
Swiffer is a command line lint tool with IDE integration that helps you keep your dust clean. It warns about Dust parse errors, then checks any set of rules defined using the Swiffer DSL (see below).

How it works:
=============
Swiffer uses Dust's dust.parse to create an Abstract Syntax Tree (AST) of the given Dust template. If there are any errors, Swiffer displays these then exits. If the template is successfully parsed, Swiffer walks the AST and checks all applicable rules for each node of the tree.

Getting Started:
================

1. run `npm install -g swiffer`
4. Go wild. Create your own rules in .swifferrc and test your own templates.

DSL examples:
===========
```
[
  {
    "name": "ifDeprecation",
    "description": "The @if creates a security hole and should be repalced by @eq, @gt, @lt, etc.",
    "target": {
      "type": "@",
      "matches": "if"
    }
  },
  {
    "name": "special characters",
    "description": "Use one of the available special characters: s, n, r, lb, rb",
    "target": {
      "type": "special"
    },
    "conditions": {
      "matches": "[s|n|r|lb|rb]"
    }
  },
  {
    "name": "jsControl |j|s",
    "description": "references within a jsControl should have |j|s",
    "target": {
      "type": "reference",
      "within": "@jsControl"
    },
    "conditions": {
      "has": {
        "filters": ["j", "s"]
      }
    }
  }
]
```
