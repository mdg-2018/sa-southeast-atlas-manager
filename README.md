<h1>SA Southeast Atlas Manager</h1>

  

This is a simple CLI tool to pause & resume every cluster in an Atlas organization. It uses a companion app running in MongoDB Stitch in order to whitelist clusters and prevent them from being paused by this application.

  

To use this app, you must have an organization owner Atlas API key.

  

Setup:<br>

Move _config.json and _key.json to config.json and key.json, then fill out required values in both files.

Slack notifications setup:

Create a JIRA request to create a [Slack webhook](https://api.slack.com/messaging/webhooks) (must be fulfilled by Slack admins).
After webhook is created, move _slack-config.json to slack-config.json, and fill in the `webhookURL` parameter.
The `payloadTemplate` can be modified as well, using [these guides](https://api.slack.com/messaging) for formatting.

  

Usage:<br>

<code>node index.js pause</code>

<br><br>

<code>node index.js resume</code>
