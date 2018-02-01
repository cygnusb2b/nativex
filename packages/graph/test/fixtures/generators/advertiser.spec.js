const expect = require('chai').expect;
const Generate = require('../../../src/fixtures/generators/advertiser');

describe('fixtures/generators/advertiser', function() {
  it('should return a factory function', function(done) {
    expect(Generate).to.be.a('function');
    done();
  });

  const fields = [
    { key: 'name', cb: v => expect(v).be.a('string') },
    { key: 'createdAt', cb: v => expect(v).be.a('number').gt(0) },
    { key: 'updatedAt', cb: v => expect(v).be.a('number').gt(0) },
  ];

  const obj = Generate();

  it('should be an object', function(done) {
    expect(obj).to.be.an('object');
    done();
  });
  it('should only contain valid field keys.', function(done) {
    const keys = fields.map(field => field.key);
    expect(obj).to.have.keys(keys);
    done();
  });
  fields.forEach((field) => {
    it(`should only have the ${field.key} property of the appropriate type.`, function(done) {
      expect(obj).to.have.property(field.key);
      field.cb(obj[field.key]);
      done();
    });
  });
});
