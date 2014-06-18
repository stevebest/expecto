"use strict";

var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var Promise = require("bluebird");

chai.should();
chai.use(chaiAsPromised);

global.chaiAsPromised = chaiAsPromised;
global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;

global.Promise = Promise;
global.fulfilledPromise = Promise.resolve;
global.rejectedPromise = Promise.reject;
global.defer = Promise.defer;
