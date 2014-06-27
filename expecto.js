var Promise = require('bluebird');
var debug = require('debug')('expecto');
var child_process = require('child_process');

function expecto(options) {
    if (typeof options === "undefined") { options = { input: process.stdin, output: process.stdout }; }
    return new expecto.Expecto(options);
}

var expecto;
(function (expecto) {

    // Re-expord bluebird Promise object
    expecto.Promise = Promise;

    function expect(pattern) {
        var resolve;
        var promise = new Promise(function () {
            resolve = arguments[0];
        }).cancellable();
        return {
            pattern: pattern,
            resolve: resolve,
            promise: promise
        };
    }

    var Expecto = (function () {
        function Expecto(options) {
            var _this = this;
            this.buffer = "";
            this.expectations = [];
            this.matchPending = false;
            this.name = options.name || 'expecto';
            this.input = options.input;
            this.output = options.output;
            this.encoding = options.encoding || 'utf8';

            this.input.on('data', function (data) {
                _this.buffer += data.toString(_this.encoding);
                _this.match();
            });

            this.reset();
        }

        Expecto.prototype.reset = function () {
            // TODO Clear eof expectation
            debug('reset');
            this.expectations = [];
        };

        Expecto.prototype.match = function () {
            this.matchPending = false;
            debug('matching %j', this.buffer);
            for (var i = 0; i < this.expectations.length; i++) {
                var expectation = this.expectations[i];
                debug('against %s', expectation.pattern);
                var matches = expectation.pattern.exec(this.buffer);
                if (matches) {
                    debug('match');

                    expectation.resolve({
                        buffer: this.buffer,
                        matches: matches
                    });

                    this.expectations.splice(i, 1);
                    this.cancel(new Error('expectation matched'));

                    // throw out the matching part of input buffer
                    this.buffer = this.buffer.slice(this.buffer.indexOf(matches[0]) + matches[0].length);
                    debug('buffer %j', this.buffer);

                    this.reset();
                } else {
                    debug('no match');
                }
            }
        };

        /** Cancel all pending expectations */
        Expecto.prototype.cancel = function (reason) {
            for (var i = 0; i < this.expectations.length; i++) {
                debug('cancelling %s', this.expectations[i].pattern);
                this.expectations[i].promise.cancel(reason);
            }

            // Clear timeout
            if (this.timeoutExpectation) {
                this.timeoutExpectation.promise.cancel(reason);
                clearTimeout(this.timeoutExpectation.timer);
                this.timeoutExpectation = null;
            }
        };

        Expecto.prototype.expect = function (pattern, cb) {
            debug('expecting %s', pattern);
            var expectation = expect(pattern);
            this.expectations.push(expectation);

            if (!this.matchPending) {
                this.matchPending = true;
                process.nextTick(this.match.bind(this));
            }

            this.timeout();

            return expectation.promise;
        };

        Expecto.prototype.timeout = function (ms, cb) {
            var _this = this;
            if (typeof ms === "undefined") { ms = 1000; }
            var timer, promise;

            if (this.timeoutExpectation) {
                promise = this.timeoutExpectation.promise;
            } else {
                promise = new Promise(function (resolve) {
                    timer = setTimeout(function () {
                        _this.promiseExpectation = null;
                        _this.cancel(new Error('timed out'));

                        resolve();
                    }, ms);
                }).cancellable();

                this.timeoutExpectation = {
                    timer: timer,
                    promise: promise
                };
            }

            return promise;
        };

        Expecto.prototype.send = function (str) {
            debug('send %j', str);
            this.output.write(str);
        };
        return Expecto;
    })();
    expecto.Expecto = Expecto;

    function spawn(command, args, options) {
        debug('spawning %s %j %j', command, args, options);
        var child = child_process.spawn(command, args, options);
        debug('spawned pid %j', child.pid);
        debug('stdout %j', child.stdout.readable);
        debug('stdin %j', child.stdin.writable);

        child.on('error', function (err) {
            debug('child process error %j', err);
        });
        child.on('exit', function () {
            debug('child process exited');
        });
        child.on('close', function () {
            debug('child process closed');
        });

        return new Expecto({
            input: child.stdout,
            output: child.stdin
        });
    }
    expecto.spawn = spawn;
})(expecto || (expecto = {}));

module.exports = expecto;
