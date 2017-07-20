const lambda = require('./viewer_request_local_s3_bucket_redirector');
const assert = require('assert');
const url = require('url');

// see http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/event-structure.html
function mockLambdaEvent(clientIp) {
  // default parameter value, node < 6 style:
  var clientIp = typeof clientIp  !== 'undefined' ?  clientIp  : '1.2.3.4';
  return({ Records:[
    { cf:
      { config:
       { distributionId:
        'ABCDEF123456' },
         request: {
          clientIp: clientIp,
          headers: {
            accept: [{
             key: 'Accept',
             value: '*/*'
            }],
            host: [{
              key: 'Host',
              value: 'd2fadu0nynjpfn.cloudfront.net'
            }],
            'user-agent': [{
              key: 'User-Agent',
              value: 'Test Agent'
            }],
            'x-forwarded-for': [{
              key: 'X-Forwarded-For',
              value: clientIp
            }]
          },
          method: 'GET',
          uri: '/some/path/file.gz'
        }
      }
    }]
  });
}
const AWS_US_EAST_IPV4 = "23.20.0.42"
const AWS_EU_CENTRAL_IPV4 = "35.156.0.42"
const AWS_US_EAST_IPV6 = "2600:1f18::42:23"
const AWS_EU_CENTRAL_IPV6 = "2a01:578:0:7100::42"

describe('the local s3 bucket redirector', function() {
  describe('for non AWS IPv4 sources', function() {
    it('should call back with the request', function() {
      var mockedEvent = mockLambdaEvent("192.160.66.42");
      lambda.handler(mockedEvent, {}, function(_, response) {
        assert.equal(response, mockedEvent.Records[0].cf.request);
      } );
    });
  });
  describe('for AWS IPv4 sources', function() {
     it('should 302 redirect if region has bucket', function() {
      lambda.handler(mockLambdaEvent(AWS_US_EAST_IPV4), {}, function(_, response) {
        assert.equal(response.status, "302");
      } );
    });
    it('should not redirect for others regions', function() {
      var mockedEvent = mockLambdaEvent(AWS_EU_CENTRAL_IPV4);
      lambda.handler(mockedEvent, {}, function(_, response) {
        assert.equal(response, mockedEvent.Records[0].cf.request);
      } );
    });
  });
  describe('for non AWS IPv6 sources', function() {
    it('should call back with the request', function() {
      var mockedEvent = mockLambdaEvent('2a04:2f80::42:23');
      lambda.handler(mockedEvent, {}, function(_, response) {
        assert.equal(response, mockedEvent.Records[0].cf.request);
      } );
    });
  });
  describe('for AWS IPv6 sources', function() {
    it('should 302 redirect if region has bucket', function() {
      lambda.handler(mockLambdaEvent(AWS_US_EAST_IPV6), {}, function(_, response) {
        assert.equal(response.status, "302");
      } );
    });
    it('should not redirect for others regions', function() {
      var mockedEvent = mockLambdaEvent(AWS_EU_CENTRAL_IPV6);
      lambda.handler(mockedEvent, {}, function(_, response) {
        assert.equal(response, mockedEvent.Records[0].cf.request);
      } );
    });
  });
  describe('for unclear sources', function() {
    it('should not fail and let CloudFront handle it', function() {
      var mockedEvent = mockLambdaEvent(AWS_EU_CENTRAL_IPV4);
      mockedEvent.Records[0].cf.request.headers['x-forwarded-for'] = null
      lambda.handler(mockedEvent, {}, function(_, response) {
        assert.equal(response, mockedEvent.Records[0].cf.request);
      } );
      mockedEvent.Records[0].cf.request.headers['x-forwarded-for'] = [{key: 'X-Forwarded-For', value: '42'}, {key: 'X-Forwarded-For', value: '1.2.3.4'}]
      lambda.handler(mockedEvent, {}, function(_, response) {
        assert.equal(response, mockedEvent.Records[0].cf.request);
      } );
      mockedEvent.Records[0].cf.request.headers['x-forwarded-for'] = [{key: 'X-Forwarded-For', value: `2a04:2f80::ab:23, 2a04:2f80::ab:1, ${AWS_EU_CENTRAL_IPV6}`}]
      lambda.handler(mockedEvent, {}, function(_, response) {
        assert.equal(response, mockedEvent.Records[0].cf.request);
      } );
      mockedEvent.Records[0].cf.request.headers = {}
      lambda.handler(mockedEvent, {}, function(_, response) {
        assert.equal(response, mockedEvent.Records[0].cf.request);
      } );
    });
  });

  describe('the response location header', function() {
     it('should be a properly formatted string', function() {
      var mockedEvent = mockLambdaEvent(AWS_US_EAST_IPV4);
      lambda.handler(mockedEvent, {}, function(_, response) {
        assert(url.parse(response.headers.location[0].value).pathname.includes(mockedEvent.Records[0].cf.request.uri))
      } );
    });
  });
  describe('the x-debug header', function() {
     it('should be a properly formatted string', function() {
      var mockedEvent = mockLambdaEvent(AWS_US_EAST_IPV4);
      lambda.handler(mockedEvent, {}, function(_, response) {
        assert(response.headers.debug[0].value.includes(`${AWS_US_EAST_IPV4} is in`))
      } );
    });
  });
});
