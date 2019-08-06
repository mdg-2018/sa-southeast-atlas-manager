const AtlasApiClient = require('atlasmanager').AtlasApiClient;
const AtlasRequest = require('atlasmanager').AtlasRequest;
const parseArgs = require('minimist');
const key = require('./key.json');

var args = parseArgs(process.argv.slice(2));
var action;
if (args._[0] == "pause" || args._[0] == "resume") {
    action = args._[0]
} else {
    throw "invalid argument"
    process.exit();
}

var orgClient = new AtlasApiClient('', key.key, key.username);
AtlasRequest.doGet('', orgClient.auth, function (err, response) {
    var projects = JSON.parse(response.body);
    projects.results.forEach((project) => {
        if (project.name.indexOf("MG") > -1) {
            togglePause(project);
        }

    })
});

function togglePause(project) {
    var client = new AtlasApiClient(project.id, key.key, key.username);
    client.clusterinfo(null, function (clusters) {
        clusters.results.forEach((cluster) => {
            if (cluster.providerSettings.instanceSizeName != "M0") {
                if (action == "pause") {
                    if (cluster.name.indexOf('nopause') == -1) {
                        client.pausecluster(cluster.name);
                    }
                } else if (action == "resume") {
                    if (cluster.name.indexOf('nopause') == -1) {
                        client.resumecluster(cluster.name);
                    }
                } else {
                    throw "invalid action"
                }

            }
        })
    })
}