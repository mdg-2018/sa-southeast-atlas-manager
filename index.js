const AtlasApiClient = require('atlasmanager').AtlasApiClient;
const AtlasRequest = require('atlasmanager').AtlasRequest;
const parseArgs = require('minimist');
const request = require('request');
const MongoClient = require('mongodb').MongoClient;
const key = require('./key.json');
const config = require("./config.json");

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

    //Don't pause clusters people don't want paused
    var stitchUrl = config.stitchWebhook + key.stitchSecret;
    request.get(stitchUrl,function(error,response,body){
        var nopause = JSON.parse(body);

        projects.results.forEach((project) => {
            togglePause(project,nopause);
    
        })
    })

    
});

function togglePause(project,nopause) {
    var client = new AtlasApiClient(project.id, key.key, key.username);
    client.clusterinfo(null, function (err, clusters) {
        if (err) {
            log("error", err);
        }
        clusters.results.forEach((cluster) => {
            if (cluster.providerSettings.instanceSizeName != "M0") {
                if (action == "pause") {
                    if (canPause(project,cluster.name,nopause)) {
                        client.pausecluster(cluster.name, function (err, result) {
                            if (err) {
                                log("error", err)
                            }

                            log("response", result)
                        });
                    }
                } else if (action == "resume") {
                    if (canPause(project,cluster.name,nopause)) {
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
    })

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
            } catch(err) {
                console.log(err);
            }
            
        } else {
            console.log(JSON.stringify(response));
        }

    }

    function canPause(project,cluster,nopause){
        var canPause = true;
        if(cluster.indexOf('nopause') > -1){
            canPause = false;
        }

        nopause.forEach((item) => {
            if(item.projectName == project.name && item.clusterName == cluster){
                canPause = false;
                
            }
        })

        return canPause;
    }
}