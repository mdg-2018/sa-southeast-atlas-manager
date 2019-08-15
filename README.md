<h1>SA Southeast Atlas Manager</h1>

This is a simple CLI tool to pause & resume every cluster in an Atlas organization. It uses a companion app running in MongoDB Stitch in order to whitelist clusters and prevent them from being paused by this application.

To use this app, you must have an organization owner Atlas API key.

Usage:
<code>node index.js pause</code>
<br><br>
<code>node index.js resume</code>