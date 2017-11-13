node-arped
----------

A cross platform ARP utility toolkit.

#### Install:

```
npm install arped
```

#### Usage:

```
var arped = require('arped');

console.log(arped.table());
```

#### API:

##### table() - String
Returns a string representation of the ARP table as it is read from the OS.

##### parse(String) - Object
Takes a string representation of the ARP table and parses it to an Object
of the following format which is then returned.

```
Devices {
 <interface>: {
  <IPs>: { <MACs> }
  <MACs>: { <IPs> }
 }
}
```

Each device/interface is represented, although the format is OS specific.
Every device/interface Object contains an IPs Object and a MACs Object.
Both of these Objects contain each other, allowing you to lookup a MAC or IP:

```
parsedTable.devices['en0'].IPs['192.168.0.1']; // 00:11:22:33:44:55
parsedTable.devices['en0'].MACs['00:11:22:33:44:55']; // 192.168.0.1
```
