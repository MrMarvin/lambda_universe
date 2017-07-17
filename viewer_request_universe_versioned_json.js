exports.handler = function(event, context, callback) {

  // keep this for future debugging, as long as the L@E API is not stabilized:
  //const util = require('util')
  //console.log(`DEBUG event: ${util.inspect(event, {breakLength: Infinity, depth: 10})}`);

  var rewrite = function(newUri) {
    if (newUri) {
      console.log(`OriginRequest universe versioned json debug: ${request.uri} -> ${newUri}`)
      request.uri = newUri
    }
    callback(null, request)
  }

  var request = event.Records[0].cf.request;
  const UNIVERSE_BASE_DIR = `/${(request.headers['host'] || [{value: 'universe.mesosphere.com'}])[0].value.split('.')[0]}`
  //const UNIVERSE_BASE_DIR = '/universe'
  var hUserAgent = (request.headers['user-agent'] || [{value: ''}])[0].value
  var hAccept = (request.headers['accept'] || [{value: '*/*'}])[0].value

  var dcosVersionRegexp = /.*dcos\/(\d+\.\d+).*/g
  // we assume a user is running DC/OS 1.6.1 if their User-Agent is provided
  // User-Agent was added to cosmos in DC/OS Release 1.8
  var dcosReleaseVersion = dcosVersionRegexp.exec(hUserAgent)
  dcosReleaseVersion = dcosReleaseVersion ? dcosReleaseVersion[1] : "1.6.1"

  var serveJson = false
  if (hAccept) {
    var universeVersionRegexp = /.*application\/vnd\.dcos\.universe\.repo\+json;charset=utf-8;version=v(\d+).*/g
    var universeVersion = universeVersionRegexp.exec(hAccept)
    universeVersion = universeVersion ? universeVersion[1] : 2
    if (universeVersion >= 3) {
      serveJson = true
    }
  }

  if (request.uri == '/repo-1.7') {
    if (serveJson && dcosReleaseVersion != '1.7') {
      return(rewrite(`${UNIVERSE_BASE_DIR}/repo/repo-empty-v3.json`))
    } else {
      return(rewrite(`${UNIVERSE_BASE_DIR}/repo/repo-up-to-1.7.zip`))
    }
  }

  if (request.uri == '/repo') {
    if (serveJson) {
      return(rewrite(`${UNIVERSE_BASE_DIR}/repo/repo-up-to-${dcosReleaseVersion}.json`))
    } else {
      return(rewrite(`${UNIVERSE_BASE_DIR}/repo/repo-up-to-${dcosReleaseVersion}.zip`))
    }
  }

  if (request.uri == '/v3/schema/repo') {
    return(rewrite(`${UNIVERSE_BASE_DIR}/v3/schema/repo`))
  }

  if (request.uri == '/v4/schema/repo') {
    return(rewrite(`${UNIVERSE_BASE_DIR}/v4/schema/repo`))
  }

  return(rewrite())
};
