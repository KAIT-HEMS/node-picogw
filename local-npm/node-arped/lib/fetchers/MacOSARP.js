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

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MacOSARP = function (_ARP) {
    (0, _inherits3.default)(MacOSARP, _ARP);

    function MacOSARP() {
        (0, _classCallCheck3.default)(this, MacOSARP);
        return (0, _possibleConstructorReturn3.default)(this, (MacOSARP.__proto__ || (0, _getPrototypeOf2.default)(MacOSARP)).call(this));
    }

    (0, _createClass3.default)(MacOSARP, [{
        key: 'fetch',
        value: function fetch() {
            var result = _child_process2.default.spawnSync('arp', ['-an']);
            if (result.error) {
                throw error;
            }
            return result.stdout.toString();
        }
    }]);
    return MacOSARP;
}(_ARP3.default);

exports.default = MacOSARP;