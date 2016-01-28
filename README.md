bimedia-rest-security
=====================

Provide client authentication to an architect application using a `rest` plugin 

### Installation

```sh
npm install --save https://github.com/bimedia-fr/bimedia-rest-security.git
```

### Usage

Boot [Architect](https://github.com/c9/architect) :

```js
var path = require('path');
var architect = require("architect");

var config = architect.loadConfig(path.join(__dirname, "config.js"));

architect.createApp(config, function (err, app) {
    if (err) {
        throw err;
    }
    console.log("app ready");
});
```

Configure rest-security with Architect `config.js` :

```js
module.exports = [{
    packagePath: 'bimedia-rest-security',
    keypath: 'http://localhost:8086/api/key/%s',
    timestampValidity: 15*60
}];
```
