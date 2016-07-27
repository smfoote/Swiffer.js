var sinon   = require('sinon'),
    expect  = require('expect.js'),
    swiffer = require('../../Swiffer');

describe('Swiffer.js', function () {

  var sandbox;
  before(function() {
    sandbox = sinon.sandbox.create();
  });
  afterEach(function() {
    sandbox.restore();
  });

  describe('clean an invalid template', function () {
    var template = '{#fooo}fooo{/fum}';

    it('should report an error for an invalid template', function () {
      var spy = sandbox.spy(swiffer, 'reportError');
      swiffer.clean(template);
      expect(spy.callCount).to.be(1);
    });

  });
  describe('support raw template syntax', function () {
    var template = '{`this is raw`}';

    it('should work fine with raw type in template', function () {
      var spy = sandbox.spy(swiffer, 'reportError');

      swiffer.clean(template);
      expect(spy.called).to.not.be.ok;
    });

  });

});
