# This project is not actively maintained

Issues and pull requests on this repository may not be acted on in a timely
manner, or at all.  You are of course welcome to use it anyway. You are even
more welcome to fork it and maintain the results.

![Unmaintained](https://nym.se/img/unmaintained.jpg)

cube-eds-poller
===============

Extract temperature, power consumption or whatever other data from an EDS
1-Wire server such as OW-SERVER-ENET.

Installation
------------

    npm install -g cube-eds-poller

Configuration
-------------

This assumes a node installation in `/opt/local`. Adjust accordingly.

    cp /opt/local/lib/node_modules/cube-eds-poller/config.json /etc/eds-poller.json
    vi /etc/eds-poller.json

Running
-------

    eds-poller /etc/eds-poller.json

There's also an SMF manifest included in the directory. Tweak it for your paths
and `svccfg import` it to start eds-poller.

License
-------

MIT
