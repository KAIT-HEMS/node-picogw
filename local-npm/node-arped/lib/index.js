'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _GenericARP = require('./fetchers/GenericARP');

var _GenericARP2 = _interopRequireDefault(_GenericARP);

var _LinuxARP = require('./fetchers/LinuxARP');

var _LinuxARP2 = _interopRequireDefault(_LinuxARP);

var _MacOSARP = require('./fetchers/MacOSARP');

var _MacOSARP2 = _interopRequireDefault(_MacOSARP);

var _WindowsARP = require('./fetchers/WindowsARP');

var _WindowsARP2 = _interopRequireDefault(_WindowsARP);

var _Parser = require('./parsers/Parser');

var _Parser2 = _interopRequireDefault(_Parser);

var _MacOSParser = require('./parsers/MacOSParser');

var _MacOSParser2 = _interopRequireDefault(_MacOSParser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Arped = function () {
    function Arped() {
        (0, _classCallCheck3.default)(this, Arped);

        if (/linux/.test(process.platform)) {
            this.arpFetcher = new _LinuxARP2.default();
        } else if (/darwin/.test(process.platform)) {
            this.arpFetcher = new _MacOSARP2.default();
        } else if (/^win/.test(process.platform)) {
            this.arpFetcher = new _WindowsARP2.default();
        } else {
            this.arpFetcher = new _GenericARP2.default();
        }

        if (/darwin/.test(process.platform)) {
            this.arpParser = new _MacOSParser2.default();
        } else {
            this.arpParser = new _Parser2.default();
        }
    }

    (0, _createClass3.default)(Arped, [{
        key: 'table',
        value: function table() {
            return this.arpFetcher.fetch();
        }
    }, {
        key: 'parse',
        value: function parse(table) {
            return this.arpParser.parse(table);
        }
    }]);
    return Arped;
}();

exports.default = Arped;