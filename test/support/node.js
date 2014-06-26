"use strict";

var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var sinon = require("sinon");
var sinonChai = require("sinon-chai");
var Promise = require("bluebird");

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

global.nop = function $nop() {};

global.chaiAsPromised = chaiAsPromised;
global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;
global.sinon = sinon;

global.Promise = Promise;
global.fulfilledPromise = Promise.resolve;
global.rejectedPromise = Promise.reject;
global.defer = Promise.defer;
