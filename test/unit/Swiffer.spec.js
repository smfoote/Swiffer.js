var sinon   = require('sinon'),
    expect  = require('expect.js'),
    swiffer = require('../../Swiffer');

describe('Swiffer.js', function () {

  describe('clean an invalid template', function () {
    var template = '{fooo{fooo{fum}';

    it('should report an error for an invalid template', function () {
      var spy = sinon.spy(swiffer, 'reportError');

      swiffer.clean(template);
      expect(spy.callCount).to.be(1);
    });

  });

});
