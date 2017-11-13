'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _ARP2 = require('./ARP');

var _ARP3 = _interopRequireDefault(_ARP2);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var LinuxARP = function (_ARP) {
    (0, _inherits3.default)(LinuxARP, _ARP);

    function LinuxARP() {
        (0, _classCallCheck3.default)(this, LinuxARP);
        return (0, _possibleConstructorReturn3.default)(this, (LinuxARP.__proto__ || (0, _getPrototypeOf2.default)(LinuxARP)).call(this));
    }

    (0, _createClass3.default)(LinuxARP, [{
        key: 'fetch',
        value: function fetch() {
            var arpPath = '/proc/net/arp';

            if (!_fs2.default.existsSync(arpPath)) {
                throw new Error('Expected ARP table at: ' + arpPath + ' but it did not exist.');
            }

            return _fs2.default.readFileSync(arpPath).toString();
        }
    }]);
    return LinuxARP;
}(_ARP3.default);

exports.default = LinuxARP;