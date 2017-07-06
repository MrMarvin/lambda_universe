const ip = require('ip');

const ipRanges = require('./ip-ranges.json')

const regionRedirectMapping = {
  "us-east-1": "https://s3.amazonaws.com/downloads.mesosphere.io",
  "default": "https://s3.amazonaws.com/downloads.mesosphere.io"
}

exports.handler = function(event, context, callback) {
  /*
  * Extract request object in order to preserve httpVersion field.
  * This is necessary to match the client's httpVersion. Please
  * refer to your CloudFront Distribution's httpVersion configuration for whether to
  * specify HTTP 1.1, 2.0 or match-viewer.
  */
  var request = event.Records[0].cf.request;
  var clientIp = request.clientIp
  var aws_region = null

  /*
    TODO: check for aws source ip addr
  */

  var ranges = ip.isV4Format(clientIp) ? ipRanges.prefixes : ipRanges.ipv6_prefixes
  for (var i = 0; i < ranges.length; i++) {
    if (ip.cidrSubnet(ranges[i].ip_prefix || ranges[i].ipv6_prefix).contains(clientIp)) {
console.log(clientIp + ' is in ' + (ranges[i].ip_prefix || ranges[i].ipv6_prefix))
      var aws_region = ranges[i].region
      break
    }
  }

  if (!aws_region) {
    // Pass on and let CloudFront serve for non AWS clients
    callback(null, request);
  } else {
    const response = {
      status: '302',
      statusDescription: '302 Found',
      httpVersion: request.httpVersion,
      headers: {
          Location: (regionRedirectMapping[aws_region] || regionRedirectMapping['default']) + request.uri,
      }
    }
    callback(null, response);
  }
};
