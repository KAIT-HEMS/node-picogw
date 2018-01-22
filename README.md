# PicoGW

[PicoGW](https://github.com/KAIT-HEMS/node-picogw) is a [Home Automation](https://en.wikipedia.org/wiki/Home_automation) and [Building Automation](https://en.wikipedia.org/wiki/Building_automation) devices gateway server, developed by [Kanagawa Institute of Technology, Smart House Research Center](http://sh-center.org/en/), released under [MIT license](https://opensource.org/licenses/mit-license.php).
PicoGW converts protocols between device-specific ones and our REST/WebSocket API.

Since this is implemented by simple node.js, it works on various unix-based platforms including Linux, MacOS, Windows (using Bash on Ubuntu on Windows), Android (using [Termux](https://play.google.com/store/apps/details?id=com.termux)).

<font color='red'>The [old repository](https://github.com/KAIT-HEMS/PicoGW) will remain public for a while, but not actively maintained any more. It will be deleted soon.</font>

## Installation

The following command installs PicoGW and all necessary plugins, with one addition of echonet lite plugin.

```bash
$ npm install -g picogw
```

Note that **a part of our system requires npm global install be executed without sudo**. For this reason, we strongly recommend to use [nvm (Node Version Manager)](https://github.com/creationix/nvm) to install node.



Other plugins installation

```bash
$ npm install -g picogw-plugin-XXXX
```

XXXX : plugin name.

## Public plugins

+ admin, web, db  (mandatory, automatically installed)
+ echonet : [ECHONET Lite](http://echonet.jp/english/) is home automation protocol that supports more than 100 kinds of home applicances. Automatcally installed.
+ openweathermap : [OpenWeatherMap](http://openweathermap.org/) is a weather db and forecasting API
+ slack
+ healbe

## Documents

[Partial documents in Japanese](http://lifedesign.tech/picogw/).
No English documents yet..sorry.