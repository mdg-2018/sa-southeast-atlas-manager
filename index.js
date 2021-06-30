const AtlasApiClient = require('atlasmanager').AtlasApiClient;
const AtlasRequest = require('atlasmanager').AtlasRequest;
const parseArgs = require('minimist');
const request = require('request');
const key = require('./key.json');
const config = require("./config.json");

var args = parseArgs(process.argv.slice(2));
var action;
if (args._[0] == "pause" || args._[0] == "resume") {
    action = args._[0]
} else {
    throw "invalid argument"
}

log("info","Running manager app.")

var orgClient = new AtlasApiClient('', key.key, key.username);
AtlasRequest.doGet('', orgClient.auth, function (err, response) {
    var projects = JSON.parse(response.body);
    if(config.test.isTest){
        projects = {
            "results": config.test.testProjects
        }
    }

    if(config.test.isTest){
        console.log(projects)
    }
    
    log("info","Examining projects " + JSON.stringify(projects.results))

    //Don't pause clusters people don't want paused
    var stitchUrl = config.stitchWebhook + key.stitchSecret;
    request.get(stitchUrl, function (error, response, body) {
        var nopause = JSON.parse(body);
        
        log("info","checking whitelist", nopause);

        projects.results.forEach((project) => {
            togglePause(project, nopause);

        })
    })


});

function togglePause(project, nopause) {
    var client = new AtlasApiClient(project.id, key.key, key.username);
    client.clusterinfo(null, function (err, clusters) {
        if (err) {
            log("error", "problem getting cluster information", err);
        }
        if (clusters) {
            clusters.results.forEach((cluster) => {
                if (cluster.providerSettings.instanceSizeName != "M0") {
                    if (action == "pause") {
                        if (canPause(project, cluster.name, nopause)) {
                            log("info","Pausing " + cluster.groupId + "/" + cluster.name)
                            client.pausecluster(cluster.name, function (err, result) {
                                if (err) {
                                    log("error", "an error occured while pausing cluster " + cluster.name, err)
                                }

                                log("response", "response from pausing " + cluster.name, result)
                            });
                        }
                        
                    } else {
                        throw "invalid action"
                    }

                }
            })
        }

    })
}

async function log(type, message,data) {
    var response = {
        "type": type,
        "time": new Date(),
        "message": message,
        "data":data
    }

    console.log(response);
}

function canPause(project, cluster, nopause) {
    var canPause = true;
    if (cluster.indexOf('nopause') > -1) {
        canPause = false;
        log("info", `Not pausing ${project.name}/${cluster} because the name contains phrase: nopause`);
    }

    nopause.forEach((item) => {
        if (item.projectName == project.name && item.clusterName == cluster) {
            canPause = false;
            log("info", `Not pausing ${item.projectName}/${item.clusterName} because it is whitelisted`);
        }
    })

    return canPause;
}
