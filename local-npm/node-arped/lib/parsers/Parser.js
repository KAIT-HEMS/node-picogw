'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var IPv4Regex = /([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/;
var MACRegex = /([0-9a-f]{1,2}[:\-][0-9a-f]{1,2}[:\-][0-9a-f]{1,2}[:\-][0-9a-f]{1,2}[:\-][0-9a-f]{1,2}[:\-][0-9a-f]{1,2})/;
var DeviceRegex = /((?:en|wl|eth)[\w]+)/;
var InterfaceRegex = /Interface:[\s]([\w.]+)/;

var ARPParser = function () {
    function ARPParser() {
        (0, _classCallCheck3.default)(this, ARPParser);
    }

    (0, _createClass3.default)(ARPParser, [{
        key: 'parse',
        value: function parse(table) {
            var parseLineHook = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

            if (!table || typeof table !== "string") {
                throw new Error('Missing table to parse');
            }

            var rows = table.split('\n'),
                result = {
                Devices: {}
            };

            if (rows.length < 2) {
                throw new Error('Table has only one row');
            }

            rows.forEach(function (row) {
                var cols = row.split(' '),
                    ip = void 0,
                    mac = void 0,
                    device = "en0";

                cols.forEach(function (col) {
                    var IPv4Result = IPv4Regex.exec(col);
                    var MacResult = MACRegex.exec(col);
                    var DeviceResult = DeviceRegex.exec(col);
                    var InterfaceResult = InterfaceRegex.exec(col);

                    if (IPv4Result) {
                        ip = IPv4Result[0];
                    }

                    if (MacResult) {
                        mac = MacResult[0];
                        mac = mac.replace(/-/g, ':');
                        mac = mac.split(':').map(function (s) {
                            return ('00' + s).slice(-2);
                        }).join(':');
                    }

                    if (DeviceResult || InterfaceResult) {
                        device = DeviceResult[0] || InterfaceResult[0];
                    }
                });

                if (parseLineHook) {
                    var entry = { ip: ip, mac: mac, device: device };
                    parseLineHook(row, entry);
                    var _ref = [entry.ip, entry.mac, entry.device];
                    ip = _ref[0];
                    mac = _ref[1];
                    device = _ref[2];
                }

                if (ip && mac && device) {
                    if (!result.Devices[device]) {
                        result.Devices[device] = {
                            IPs: {},
                            MACs: {}
                        };
                    }

                    result.Devices[device].IPs[ip] = mac;
                    result.Devices[device].MACs[mac] = ip;
                }
            });

            return result;
        }
    }]);
    return ARPParser;
}();

exports.default = ARPParser;