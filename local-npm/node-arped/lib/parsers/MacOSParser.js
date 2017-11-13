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

var _get2 = require('babel-runtime/helpers/get');

var _get3 = _interopRequireDefault(_get2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _Parser = require('./Parser');

var _Parser2 = _interopRequireDefault(_Parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DeviceRegex = /on (\w+) ifscope/;

var MacOSParser = function (_ARPParser) {
    (0, _inherits3.default)(MacOSParser, _ARPParser);

    function MacOSParser() {
        (0, _classCallCheck3.default)(this, MacOSParser);
        return (0, _possibleConstructorReturn3.default)(this, (MacOSParser.__proto__ || (0, _getPrototypeOf2.default)(MacOSParser)).call(this));
    }

    (0, _createClass3.default)(MacOSParser, [{
        key: 'parse',
        value: function parse(table) {
            return (0, _get3.default)(MacOSParser.prototype.__proto__ || (0, _getPrototypeOf2.default)(MacOSParser.prototype), 'parse', this).call(this, table, function (row, entry) {
                var DeviceResult = DeviceRegex.exec(row);
                if (DeviceResult) {
                    entry.device = DeviceResult[1];
                }
            });
        }
    }]);
    return MacOSParser;
}(_Parser2.default);

exports.default = MacOSParser;