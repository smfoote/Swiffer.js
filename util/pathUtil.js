var fs = require('fs');


function searchUp (dir, target, results) {
  var filePath = dir + '/' + target;
  var parentPath = dir.split('/').slice(0, -1).join('/');
  results = results || [];

  if (fs.existsSync(filePath)) {
    results.push(filePath);
  }

  if (dir.length === 0) {
    return results;
  } else {
    return searchUp(parentPath, target, results);
  }
}

module.exports.searchUp = searchUp;
