/* global dust:true, _:true, console:false */
var swiffer = {},
    dust = require('dustjs-linkedin'),
    _ = require('underscore');

swiffer.errors = [];
swiffer.rules = {
  '#': [
  ],
  '@': [
    {
      'name': '@if',
      'description': '@if is deprecated. Please use @eq, @gt, @lt, etc.',
      'target': {
        'type': '@',
        'matches': /if/
      }
    },
    {
      'name': '@pre.i18n has key and text',
      'description': '@pre.i18n must have both `key` and `text` params',
      'target': {
        'type': '@',
        'matches': /pre\.i18n/
      },
      'conditions': {
        'has': {
          'params': [['key'],['text']]
        }
      }
    },
    {
      'name': '@pre.i18n key names',
      'description': '@pre.i18n key should start with i18n',
      'target': {
        'type': '@',
        'matches': /pre\.i18n/
      },
      'conditions': {
        'has': {
          'params': [['key', /^i18n+/]]
        }
      }
    },
    {
      'name': '@pre.i18n has filter="|s" or output="json"',
      'description': '@pre.i18n must have filter="|s" or output="json"',
      'target': {
        'type': '@',
        'matches': /pre\.i18n/
      },
      'conditions': {
        'or': [
          {
            'has': {
              'params': [['filter','|s']]
            }
          },
          {
            'or': [
              {
                'has': {
                  'params': [['output','json']]
                }
              },
              {
                'has': {
                  'params': [['output', 'none']]
                }
              }
            ]
          }
        ]
      }
    }
  ],
  '?': [
  ],
  '^': [
  ],
  'reference': [
    {
      'name': '|j|s on reference',
      'description': 'references within @jsControl\'s should have |j|s',
      'target': {
        'type': 'reference',
        'within': [ '@jsControl' ]
      },
      'conditions': {
        'has': {
          'filters': ['j', 's']
        }
      }
    }
  ],
  'special': [
    {
      'name': 'special characters',
      'description': 'Use one of the available special characters: s, n, r, lb, rb',
      'target': {
        'type': 'special'
      },
      'conditions': {
        'matches': /[s|n|r|lb|rb]/
      }
    }
  ]
};

/**
 * Add the given error to the errors array
 * @method reportError
 * @param {String} msg The error message
 * @return {Void}
 * @private
 */
swiffer.reportError = function(msg) {
  swiffer.errors.push(msg);
  console.error(msg);
};

/**
 * Report any parse errors and rule exceptions of a given template
 * @param {String} template The template to be cleaned
 * @return {Boolean} Returns true if all tests pass, and false otherwise
 * @public
 */
swiffer.clean = function(template) {

  // The context gets passed around and maintains the state of the AST
  var context = {
    within: [],
    name: ''
  }, ast;
  try {
    ast = dust.parse(template);
    swiffer.step(context, ast);
  } catch (err) {
    // Find any parse errors
    swiffer.reportError(err);
  }
};

/**
 * Step through all the nodes of a body
 */
swiffer.stepParts = function(context, node) {
  var i, len;
  for (i=1, len=node.length; i<len; i++) {
    swiffer.step(context, node[i]);
  }
};

/**
 * Step through the nodes of the AST
 * @param {Object} context Where we are in the AST
 * @param {Array} node The current node in the AST
 * @return {Void}
 * @public
 */
swiffer.step = function(context, node) {
  swiffer.nodes[node[0]](context, node);
};

swiffer.stepThroughSection = function(context, node) {
  var type = node[0];
  context.name = node[1][1];
  context.within.push(type);
  swiffer.check(context, node);
  swiffer.step(context, node[4]);
  context.within.pop();
};

swiffer.nodes = {
  'body': function(context, node) {
    swiffer.stepParts(context, node);
  },
  'reference': function(context, node) {
    context.name = node[1][1];
    swiffer.check(context, node);
  },
  '?': function(context, node) {
    swiffer.stepThroughSection(context, node);
  },
  '^': function(context, node) {
    swiffer.stepThroughSection(context, node);
  },
  '#': function(context, node) {
    swiffer.stepThroughSection(context, node);
  },
  'partial': function(context, node) {
  },
  '<': function(context, node) {
    context.name = node[1][1];
    swiffer.check(context, node);
    swiffer.step(context, node[4]);
  },
  '+': function(context, node) {
  },
  '@': function(context, node) {
    var type = node[0],
        name = node[1][1];
    context.within.push(type);
    context.within.push(type + name);
    context.name = name;
    swiffer.check(context, node);
    swiffer.step(context, node[4]);
    context.within.pop();
    context.within.pop();
  },
  'param': function(context, node) {
    swiffer.step(context, node[1]);
    swiffer.step(context, node[2]);
  },
  'literal': function() {
    return true;
  },
  'params': function(context, node) {
  },
  'bodies': function(context, node) {
    for (var i=1, len=node.length; i<len; i++) {
      swiffer.step(context, node[i]);
    }
  },
  'special': function(context, node) {
    context.name = node[1];
    swiffer.check(context, node);
  }
};

function checkWithin(ruleWithin, contextWithin) {
  return _.isEqual(ruleWithin, _.intersection(ruleWithin, contextWithin));
}

/**
 * Get the rules applicable to the given node
 * @param {Object} context Where we are in the nesting
 * @param {Array} node The node to which the rules must apply
 * @return {Array} An array of rules objects
 * @private
 */
swiffer.getRules = function(context, node) {
  var type = node[0],
      name = node[1].text,
      rules = swiffer.rules[type],
      result = [],
      i, len, rule;
  for (i=0, len=rules.length; i<len; i++) {
    rule = rules[i];
    if ((rule.target.within && !checkWithin(rule.target.within, context.within)) ||
        (rule.target.matches && !rule.target.matches.test(name))) {
     // rules.splice(i, 1);
    } else {
      result.push(rule);
    }
  }
  return result;
};


/**
 * Check a node for compliance with each rule applicable to that node
 * @param {Object} context Where we are in the nesting
 * @param {Array} node The node to be checked
 * @return {Boolean|String} Either true, or a message explaining the error
 * @private
 */
swiffer.check = function(context, node) {
  var type = node[0],
      name = node[1].text,
      rules, conditions, i, len, k;
  rules = swiffer.getRules(context, node);
  rules.forEach(function(rule) {
    conditions = rule.conditions;
    if (conditions) {
      _.each(conditions, function(condition, key) {
        if (!swiffer.conditions[key](condition, node, context)) {
          swiffer.reportError(rule.description);
        }
      });
    } else {
      swiffer.reportError(rule.description);
    }
  });
};

function convertParams(params) {
  var result = {};
  for (var i=1, len=params.length; i<len; i++) {
    result[params[i][1][1]] = params[i][2][1];
  }
  return result;
}

swiffer.conditions = {
  'or': function(conditions, node) {
    var condition, i, len, key;
    for (i=0, len=conditions.length; i<len; i++) {
      condition = conditions[i];
      for (key in condition) {
        if (swiffer.conditions[key](condition[key], node)){
          return true;
        }
      }
    }
    return false;
  },
  'has': function(condition, node) {
    for (var k in condition) {
      if (condition.hasOwnProperty(k)) {
        if (!swiffer.conditions[k](condition[k], node)) {
          return false;
        }
      }
    }
    return true;
  },
  'hasNot': function(condition, node) {
    for (var k in condition) {
      if (condition.hasOwnProperty(k)) {
        if (swiffer.conditions[k](condition[k], node)) {
          return false;
        }
      }
    }
    return true;
  },
  'matches': function(regex, node, context) {
    var name = context.name;
    return regex.test(name);
  },
  'params': function(params, node) {
    var nodeParams = convertParams(node[3]),
        param, paramKey, paramVal;
    for (var i=0, len=params.length; i<len; i++) {
      param = params[i];
      paramKey = param[0];
      paramVal = param[1];

      // Check for param existence
      if (!nodeParams[paramKey]) {
        return false;
      }

      // Check for value match
      if (paramVal) {
        if ((paramVal instanceof RegExp && !paramVal.test(nodeParams[paramKey])) ||
            (typeof paramVal === 'string' && paramVal !== nodeParams[paramKey])) {
          return false;
        }
      }
    }
    return true;
  },
  'filters': function(filters, node) {
    var nodeFilters = node[2].slice(1);
    if (_.difference(filters, nodeFilters).length) {
      return false;
    }
    return true;
  }
};

swiffer.clean('{@pre.i18n key="i18n_key" text="My text" output="json"/}{@pre.i18n key="i18n_My_key" text="more text" output="json"/}{@jsControl}{ref|s|j}{/jsControl}{~s}');
