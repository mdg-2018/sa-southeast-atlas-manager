const AtlasApiClient = require('atlasmanager').AtlasApiClient;
const AtlasRequest = require('atlasmanager').AtlasRequest;
const parseArgs = require('minimist');
const request = require('request');
const MongoClient = require('mongodb').MongoClient;
const key = require('./key.json');
const config = require("./config.json");
const slackConfig = require("./slack-config.json"); //for sending slack notifications

var args = parseArgs(process.argv.slice(2));
var action;
var pauseClusterInfo = [];  //Information on clusters paused to format Slack notification

if (args._[0] == "pause" || args._[0] == "resume") {
    action = args._[0]
} else {
    throw "invalid argument"
    process.exit();
}

var orgClient = new AtlasApiClient('', key.key, key.username);
AtlasRequest.doGet('', orgClient.auth, function (err, response) {
    var projects = JSON.parse(response.body);

    //Don't pause clusters people don't want paused
    var stitchUrl = config.stitchWebhook + "?secret=" + key.stitchSecret;
    request.get(stitchUrl, function (error, response, body) {
        var nopause = JSON.parse(body);
        log("checking whitelist",nopause);

        var promises = [];
        projects.results.forEach((project) => {
            promises.push(togglePause(project, nopause));

        })
        Promise.all(promises).then(() => {
            sendSlackNotification(pauseClusterInfo);
        })
    })


});

function togglePause(project, nopause) {
    return new Promise(
        function(resolve, reject) {
            var client = new AtlasApiClient(project.id, key.key, key.username);
            client.clusterinfo(null, function (err, clusters) {
            if (err) {
                log("error", err);
            }
            clusters.results.forEach((cluster) => {
                var instanceSize = cluster.providerSettings.instanceSizeName; //Get instance size
                if (instanceSize != "M0" && instanceSize != "M2" && instanceSize != "M5" && !cluster.paused) {
                    if (action == "pause") {
                        if (canPause(project, cluster.name, nopause)) {
                            client.pausecluster(cluster.name, function (err, result) {
                                if (err) {
                                    log("error", err)
                                }

                                //Add paused cluster to pauseClusterInfo list
                                pauseClusterInfo.push(
                                    {"projectName": project.name, "clusterName": cluster.name}
                                )
                                log("response", result)
                            });
                        }
                    } else if (action == "resume") {
                        if (canPause(project, cluster.name, nopause)) {
                            client.resumecluster(cluster.name, function (err, result) {
                                if (err) {
                                    log("error", err)
                                }

                                log("response", result)
                            });
                        }
                    } else {
                        throw "invalid action"
                    }

                }
            })
            resolve(pauseClusterInfo); //resolve Promise and return pauseClusterInfo list
        })
    }
    )
}

function log(type, message) {
    var date = new Date();
    var response = {
        "type": type,
        "time": new Date(),
        "message": message
    }

    if (config.logLocation == "mongodb") {
        try {
            var mongoClient = new MongoClient(config.mongoURI);
            mongoClient.connect(function (err) {
                if (err) {
                    console.log(err);
                }
                mongoClient.db(config.logDB).collection(config.logCollection).insertOne(response, function (err, result) {
                    if (err) {
                        console.log(err);
                    }
                    mongoClient.close();
                });
            })
        } catch (err) {
            console.log(err);
        }

    } else {
        console.log(JSON.stringify(response));
    }

}

function canPause(project, cluster, nopause) {
    var canPause = true;
    if (cluster.indexOf('MC-') > -1) { //Checking for MC- in front, instead of 'nopause'
        canPause = false;
        log("cluster not paused", `Not pausing ${item.projectName}/${item.clusterName} because the name contains phrase: MC-`);
    }

    nopause.forEach((item) => {
        if (item.projectName.toUpperCase() == project.name.toUpperCase() && 
            item.clusterName.toUpperCase() == cluster.toUpperCase()) { //Case Insensitive Whitelist Match
            canPause = false;
            log("cluster not paused", `Not pausing ${item.projectName}/${item.clusterName} because it is whitelisted`);
        }
    })

    return canPause;
}

function sendSlackNotification(pauseClusterInfo) {

    var slackPayload = slackConfig.payloadTemplate;

    //Add in specific Slack messaging
    if (pauseClusterInfo.length > 0) {
        slackPayload.blocks[2].text.text += "Today, I've paused the following clusters:\n";
        pauseClusterInfo.forEach((cluster) => {
            slackPayload.blocks[2].text.text += "• Project: " + cluster.projectName + ", " + "Cluster: " + cluster.clusterName + "\n";
        })
    }
    else { //Message if no clusters paused
        slackPayload.blocks[2].text.text += "There were no clusters paused in today's run."
    }
    
    request({
        url: slackConfig.webhookURL,
        method: "POST",
        json: true,
        body: slackPayload
    }, (err, resp, body) => {
        if (err) {
            log("error", err);
        }
    });
}
