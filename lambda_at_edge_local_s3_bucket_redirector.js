const ipaddr = require('ipaddr.js')
const ipRanges = require('./ip-ranges.json')

const regionRedirectMapping = {
  "us-east-1": "https://s3.amazonaws.com/downloads.mesosphere.io",
  "default": "https://s3.amazonaws.com/downloads.mesosphere.io"
}

exports.handler = function(event, context, callback) {

  // keep this for future debugging, as long as the L@E API is not stabilized:
  //const util = require('util')
  //console.log(`Lambda at Edge local S3 bucket redirector debug: event: ${util.inspect(event, {breakLength: Infinity, depth: 10})}`);

  var request = event.Records[0].cf.request;
  var clientIp = ipaddr.parse(request.headers['x-forwarded-for'][0].value)
  var aws_region = null
  var aws_ip_range = null

  var ranges = clientIp.kind() == 'ipv4' ? ipRanges.prefixes : ipRanges.ipv6_prefixes
  for (var i = 0; i < ranges.length; i++) {
    if (clientIp.match(ipaddr.parseCIDR(ranges[i].ip_prefix || ranges[i].ipv6_prefix))) {
      aws_region = ranges[i].region
      aws_ip_range = ranges[i].ip_prefix || ranges[i].ipv6_prefix
      break
    }
  }

  if (!aws_region) {
    // Pass on and let CloudFront serve for non AWS clients
    console.log(`Lambda at Edge local S3 bucket redirector debug: ${clientIp} not in any range, not redirecting.`);
    callback(null, request);
  } else {
    const response = {
      status: '302',
      statusDescription: '302 Found',
      httpVersion: request.httpVersion,
      headers: {
        location: [{
          key: 'Location',
          value: (regionRedirectMapping[aws_region] || regionRedirectMapping['default']) + request.uri
        }],
        debug: [{
          key: 'Debug',
          value: `${clientIp} is in ${aws_ip_range} -> ${aws_region}, redirecting.`
        }]
      }
    }
    console.log(`Lambda at Edge local S3 bucket redirector debug: ${clientIp} is in ${aws_ip_range} -> ${aws_region} , redirecting.`);
    callback(null, response);
  }
};
