
const ipaddr = require('ipaddr.js')
const ipRanges = require('./ip-ranges.json')

const regionRedirectMapping = {
  "us-east-1": "https://s3.amazonaws.com/downloads.mesosphere.io",
  "us-west-2": "https://s3-us-west-2.amazonaws.com/us-west-2-downloads.mesosphere.io"
}

exports.handler = function(event, context, callback) {

  // keep this for future debugging, as long as the L@E API is not stabilized:
  //const util = require('util')
  //console.log(`Lambda at Edge local S3 bucket redirector debug: event: ${util.inspect(event, {breakLength: Infinity, depth: 10})}`);

  var request = event.Records[0].cf.request;
  try {
    var clientIp = ipaddr.parse(request.clientIp.split(',').pop())
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
  } catch(err) {
    console.log(`ViewerRequest local s3 bucket redirector ERROR: could not parse event or find clientIp with it: ${err}`);
    callback(null, request)
  }

  if (aws_region && aws_region in regionRedirectMapping) {
    const response = {
      status: '302',
      statusDescription: 'Found',
      httpVersion: request.httpVersion,
      headers: {
        location: [{
          key: 'Location',
          value: regionRedirectMapping[aws_region] + request.uri
        }],
        debug: [{
          key: 'Debug',
          value: `${clientIp} is in ${aws_ip_range} -> ${aws_region}, redirecting.`
        }]
      }
    }
    console.log(`ViewerRequest local s3 bucket redirector debug: ${clientIp} is in ${aws_ip_range} (${aws_region}), redirecting to ${regionRedirectMapping[aws_region] + request.uri}`);
    callback(null, response);
  } else {
    if (aws_region) {
      console.log(`ViewerRequest local s3 bucket redirector debug: ${clientIp} in ${aws_region} but no redirect target for this region, not redirecting.`);
    } else {
      console.log(`ViewerRequest local s3 bucket redirector debug: ${clientIp} not in any range, not redirecting.`);
    }
    // Pass on and let CloudFront serve for non AWS clients
    callback(null, request);
  }
};
