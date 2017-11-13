'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _ARP2 = require('./ARP');

var _ARP3 = _interopRequireDefault(_ARP2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var GenericARP = function (_ARP) {
    (0, _inherits3.default)(GenericARP, _ARP);

    function GenericARP() {
        (0, _classCallCheck3.default)(this, GenericARP);
        return (0, _possibleConstructorReturn3.default)(this, (GenericARP.__proto__ || (0, _getPrototypeOf2.default)(GenericARP)).call(this));
    }

    return GenericARP;
}(_ARP3.default);

exports.default = GenericARP;