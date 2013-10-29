/* global dust:true, _:true, console:false */
var swiffer = {},
    dust = require('dustjs-linkedin'),
    fs = require('fs'),
    path = require('path'),
    _ = require('underscore');

swiffer.resetRules = function() {
  swiffer.rules = {
    '#': [],
    '?': [],
    '^': [],
    '@': [],
    '>': [],
    '<': [],
    '+': [],
    '%': [],
    'special': [],
    'reference': [],
    'comment':[],
    'partial': []
  };
};

swiffer.errors = [];

/**
 * Add the given error to the errors array
 * @method reportError
 * @param {String} msg The error message
 * @return {Void}
 * @private
 */
swiffer.reportError = function(msg, line, col) {
  if (line && col) {
    msg = 'Line ' + line + ', Column ' + col + ': ' + msg;
  }
  swiffer.errors.push(msg);
};

/**
 * Take a set of rules and sort them by type, assigning them to swiffer.rules
 * @method sortRulesByType
 * @param {Array} rules An array of rules.
 * @return {Void}
 * @private
 */
function sortRulesByType(rules) {
  _.each(rules, function(rule) {
    var type = rule.target.type;
    if (swiffer.rules[type]) {
      swiffer.rules[type].push(rule);
    } else {
      swiffer.rules.type = [rule];
    }
  });
}

/**
 * Report any parse errors and rule exceptions of a given template
 * @param {String} template The template to be cleaned
 * @param {Array} rules A list of rules to be checked, in the Swiffer DSL
 * @return {Boolean} Returns true if all tests pass, and false otherwise
 * @public
 */
swiffer.clean = function(template, rules) {

  // The context gets passed around and maintains the state of the AST
  var context = {
    within: [],
    name: ''
  }, ast, errInfo;
  // Reset errors
  swiffer.errors = [];
  // Reset rules
  swiffer.resetRules();
  // Get the rules set up
  sortRulesByType(rules);
  try {
    ast = dust.parse(template);
    swiffer.step(context, ast);
  } catch (err) {
    // Find any parse errors
    if (!err.line && !err.column) {
      // Extract line and column from the message.
      errInfo = err.message.match(/line : (\d+), column : (\d+)/);
      err.line = errInfo[1];
      err.column = errInfo[2];
      err.message = err.message.split('At line')[0];
    }
    swiffer.reportError(err.message, err.line, err.column);
  }
  return swiffer.errors;
};

/**
 * Step through all the nodes of a body
 */
swiffer.stepParts = function(context, node) {
  var i, len;
  for (i=1, len=node.length - 2; i<len; i++) {
    swiffer.step(context, node[i]);
  }
};

/**
 * Step through the nodes of the AST
 * @param {Object} context Where we are in the AST
 * @param {Array} node The current node in the AST
 * @return {Void}
 * @private
 */
swiffer.step = function(context, node) {
  swiffer.nodes[node[0]](context, node);
};

/**
 * Run a check on the section, and step into the body of the section
 * @method stepThroughSection
 * @param {Object} context Where we are in the AST
 * @param {Array} node The current node in the AST
 * @return {Void}
 * @private
 */
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
    context.within.push(node[0]);
    swiffer.check(context, node);
    swiffer.step(context, node[1]);
    context.within.pop();
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
  'buffer': function() {
  },
  'format': function() {
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
  },
  'comment': function(context, node) {
    swiffer.check(context, node);
  },
  '%': function(context, node) {
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
      name = node[1].text || node[1][1],
      rules = swiffer.rules[type],
      result = [],
      i, len, rule;
  for (i=0, len=rules.length; i<len; i++) {
    rule = rules[i];
    if ((rule.target.within && !checkWithin(rule.target.within, context.within)) ||
        (rule.target.matches && !(new RegExp(rule.target.matches).test(name))) ||
        (rule.target.equals && rule.target.equals !== name)) {
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
  var rules, conditions, i, len, k;
  rules = swiffer.getRules(context, node);
  rules.forEach(function(rule) {
    conditions = rule.conditions;
    if (conditions) {
      _.each(conditions, function(condition, key) {
        if (!swiffer.conditions[key](condition, node, context)) {
          swiffer.reportError(rule.description, node.slice(-2)[0][1], node.slice(-1)[0][1]);
        }
      });
    } else {
      swiffer.reportError(rule.description, node.slice(-2)[0][1], node.slice(-1)[0][1]);
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
  'hasOnly': function(condition, node) {
    for (var k in condition) {
      if (condition.hasOwnProperty(k)) {
        if (!swiffer.conditions[k](condition[k], node, true)) {
          return false;
        }
      }
    }
    return true;
  },
  'matches': function(regex, node, context) {
    var name = context.name;
    regex = new RegExp(regex);
    return regex.test(name);
  },


  'bodies': function(condition, node, only) {
    return node[4].length > 1;
  },
  'params': function(params, node, only) {
    var nodeParams = convertParams(node[3]),
        nodeParamKeys = Object.keys(nodeParams),
        paramKeys = [],
        param, paramKey, paramVal;
    for (var i=0, len=params.length; i<len; i++) {
      param = params[i];
      paramKey = param[0];
      paramVal = param[1];
      paramKeys.push(paramKey);

      // Check for param existence
      if (!nodeParams[paramKey]) {
        return false;
      }

      // Check for value match
      if (paramVal) {
        paramVal = new RegExp(paramVal);
        console.log(paramVal);
        if (!paramVal.test(nodeParams[paramKey])) {
          return false;
        }
      }
    }
    if (only && (_.difference(nodeParamKeys, paramKeys).length || _.difference(paramKeys, nodeParamKeys).length)) {
      return false;
    }
    return true;
  },
  'filters': function(filters, node, only) {
    var nodeFilters = node[2].slice(1);
    if (_.difference(filters, nodeFilters).length) {
      return false;
    }
    if (only && filters.length !== nodeFilters.length) {
      return false;
    }
    return true;
  }
};

module.exports = swiffer;
