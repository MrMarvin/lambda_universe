const lambda = require('./lambda_at_edge_local_s3_bucket_redirector');
const assert = require('assert');
const url = require('url');

// see http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/event-structure.html
function mockLambdaEvent(clientIp) {
  // default parameter value, node < 6 style:
  var clientIp = typeof clientIp  !== 'undefined' ?  clientIp  : '1.2.3.4';
  return(
    {"Records":[
      {
        "cf": {
          "config": {
            "distributionId": "EXAMPLE"
          },
          "request": {
            "uri": "/me.pic",
            "method": "GET",
            "httpVersion": "2.0",
            "clientIp": clientIp,
            "headers": {
              "User-Agent": ["Test Agent"],
              "Host" : ["d2fadu0nynjpfn.cloudfront.net"]
            }
          }
        }
      }
    ]
  });
}

describe('the handler', function() {
  describe('for non AWS IPv4 sources', function() {
    it('should call back with the request', function() {
      var mockedEvent = mockLambdaEvent("192.160.66.42");
      lambda.handler(mockedEvent, {}, function(_, response) {
        assert.equal(response, mockedEvent.Records[0].cf.request);
      } );
    });
  });
  describe('for AWS IPv4 sources', function() {
     it('should 302 redirect', function() {
      lambda.handler(mockLambdaEvent("13.32.0.42"), {}, function(_, response) {
        assert.equal(response.status, "302");
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
     it('should 302 redirect', function() {
      lambda.handler(mockLambdaEvent("2a05:d07f:c000::23:42"), {}, function(_, response) {
        assert.equal(response.status, "302");
      } );
    });
  });

  describe('the response location header', function() {
     it('should be a properly formatted string', function() {
      var mockedEvent = mockLambdaEvent('13.32.0.42');
      lambda.handler(mockedEvent, {}, function(_, response) {
        assert(url.parse(response.headers['Location']).pathname.includes(mockedEvent.Records[0].cf.request.uri))
      } );
    });
  });
});
