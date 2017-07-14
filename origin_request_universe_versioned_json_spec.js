const lambda = require('./origin_request_universe_versioned_json');
const assert = require('assert');

// see http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/event-structure.html
function mockLambdaEvent(path, hUserAgent, hAccept) {
  // default parameter value, node < 6 style:
  var path = typeof path  !== 'undefined' ?  path  : "/";
  var hUserAgent = typeof hUserAgent  !== 'undefined' ?  hUserAgent  : "dcos/1.10";
  var hAccept = typeof hAccept  !== 'undefined' ?  hAccept  : "application/vnd.dcos.universe.repo+json;charset=utf-8;version=v4";
  return({ Records:[
    { cf:
      { config:
       { distributionId:
        'ABCDEF123456' },
         request: {
          clientIp: "4.3.2.1",
          headers: {
            accept: [{
             key: 'Accept',
             value: hAccept
            }],
            host: [{
              key: 'Host',
              value: 'lambdauniverse.mesosphere.com'
            }],
            'user-agent': [{
              key: 'User-Agent',
              value: hUserAgent
            }],
            'x-forwarded-for': [{
              key: 'X-Forwarded-For',
              value: "1.2.3.4"
            }]
          },
          method: 'GET',
          uri: path
        }
      }
    }]
  });
}

describe('the server', function() {
  describe('for dcos/1.10 clients', function() {
    it('should directly get the json file', function() {
      var mockedEvent = mockLambdaEvent("/repo", "dcos/1.10");

      lambda.handler(mockedEvent, {}, function(_, request) {
        assert(request.uri.match("repo-up-to-1.10.json"));
      } );
    });
  });
});
