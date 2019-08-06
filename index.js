const AtlasApiClient = require('atlasmanager').AtlasApiClient;
const AtlasRequest = require('atlasmanager').AtlasRequest;
const parseArgs = require('minimist');
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
    projects.results.forEach((project) => {
        if (project.name.indexOf("MG") > -1) {
            togglePause(project);
        }

    })
});

function togglePause(project) {
    var client = new AtlasApiClient(project.id, key.key, key.username);
    client.clusterinfo(null, function (err, clusters) {
        if (err) {
            log("error", err);
        }
        clusters.results.forEach((cluster) => {
            if (cluster.providerSettings.instanceSizeName != "M0") {
                if (action == "pause") {
                    if (cluster.name.indexOf('nopause') == -1) {
                        client.pausecluster(cluster.name, function (err, result) {
                            if (err) {
                                log("error", err)
                            }

                            log("response", result)
                        });
                    }
                } else if (action == "resume") {
                    if (cluster.name.indexOf('nopause') == -1) {
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
        var response = {
            "type": type,
            "message": message
        }

        if (config.logLocation == "mongodb") {
            try {
                var mongoClient = new MongoClient(config.mongoURI);
                mongoClient.connect(function (err) {
                    if (err) {
                        console.log(err);
                    }
                    mongoClient.db('applogs').collection('saSoutheastAtlasManager').insertOne(response, function (err, result) {
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
}