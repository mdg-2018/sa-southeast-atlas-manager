const client = stitch.Stitch.initializeDefaultAppClient('utils-ppdem');

function checkAuth(callback) {
    if (!client.auth.isLoggedIn) {
        if (client.auth.hasRedirectResult()) {
            client.auth.handleRedirectResult().then(user => {
                callback(true);
            });
        } else {
            const credential = new stitch.GoogleRedirectCredential();
            client.auth.loginWithRedirect(credential);
        }
    } else {
        callback(true)
    }


}




function addToList(project, clustername) {
    var projectName = document.getElementById('projectName').value;
    var clusterName = document.getElementById('clusterName').value;

    checkAuth(function (user) {
        var newRecord = {
            "userid": client.auth.user.id,
            "email": client.auth.user.profile.email,
            "projectName": projectName,
            "clusterName": clusterName
        }

        client.callFunction('addClusterName', [newRecord]).then((result) => {
            getList(function (clusters) {
                printList(clusters);
            })
        });

    })
}

function removeFromList(id, projectName, clusterName, ownerEmail) {
    if (client.auth.user.profile.email == ownerEmail) {
        var confirmation = confirm(`Are you sure you want to remove ${projectName}/${clusterName}?`);
        if (confirmation) {
            client.callFunction('removeClusterName', [id]).then((result) => {
                getList(function (clusters) {
                    printList(clusters);
                })
            })
        }
    } else {
        alert('You can only remove your own items!')
    }


}

function getList(callback) {
    checkAuth(function (isAuthenticated) {
        client.callFunction('getClusters', []).then((clusters) => {
            callback(clusters);
        });
    })
}

function printList(clusters) {
    var table = document.getElementById('clusterList');

    table.innerHTML = `<tr>
    <td>
      Owner
    </td>
    <td>
      Project Name
    </td>
    <td>
      Cluster Name
    </td>
    <td>
      Date Whitelisted
    </td>
    <td>
      
    </td>
  </tr>`;

    clusters.forEach((cluster) => {
        var row = document.createElement('tr');
        var tblUser = document.createElement('td');
        var tblProject = document.createElement('td');
        var tblCluster = document.createElement('td');
        var tblDate = document.createElement('td');
        var tblDelete = document.createElement('td');

        tblUser.innerHTML = cluster.email;
        tblProject.innerHTML = cluster.projectName;
        tblCluster.innerHTML = cluster.clusterName;
        
        var dateContent = document.createElement('div');
        dateContent.setAttribute("style","width:200px;");
        dateContent.innerHTML = cluster.whitelist_date;
        tblDate.appendChild(dateContent);

        var deleteButton = document.createElement('button');
        deleteButton.setAttribute('onclick', `removeFromList('${cluster._id}','${cluster.projectName}','${cluster.clusterName}','${cluster.email}')`);
        deleteButton.innerHTML = "Remove";
        tblDelete.appendChild(deleteButton);

        row.appendChild(tblUser);
        row.appendChild(tblProject);
        row.appendChild(tblCluster);
        row.appendChild(tblDate);
        row.appendChild(tblDelete);

        table.appendChild(row);
    })
}


getList(function (clusters) {
    printList(clusters);
});
