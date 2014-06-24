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
        var resolve, reject;
        var promise = new Promise(function () {
            resolve = arguments[0];
            reject = arguments[1];
        });
        return {
            pattern: pattern,
            resolve: resolve,
            reject: reject,
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
            this.child = options.child;

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
                    this.reject(new Error('another expectation matched'));

                    // throw out the matching part of input buffer
                    this.buffer = this.buffer.slice(this.buffer.indexOf(matches[0]) + matches[0].length);
                    debug('buffer %j', this.buffer);

                    this.reset();
                } else {
                    debug('no match');
                }
            }
        };

        /** Rejects all expectations */
        Expecto.prototype.reject = function (err) {
            for (var i = 0; i < this.expectations.length; i++) {
                debug('rejecting %s', this.expectations[i].pattern);
                this.expectations[i].reject(err);
            }

            // Clear timeout
            this.timeoutExpectation && this.timeoutExpectation.reject();
            this.timeoutExpectation = null;
        };

        Expecto.prototype.expect = function (pattern) {
            debug('expecting %s', pattern);
            var expectation = expect(pattern);
            this.expectations.push(expectation);

            if (!this.matchPending) {
                this.matchPending = true;
                process.nextTick(this.match.bind(this));
            }

            return expectation.promise;
        };

        Expecto.prototype.timeout = function (ms) {
            var _this = this;
            if (typeof ms === "undefined") { ms = 1000; }
            var resolve, reject, timer, promise;

            if (!this.timeoutExpectation) {
                promise = new Promise(function () {
                    resolve = arguments[0];
                    reject = arguments[1];
                    timer = setTimeout(function () {
                        _this.reject(new Error('timed out'));
                        resolve();
                    }, ms);
                });

                this.timeoutExpectation = {
                    timer: timer,
                    promise: promise,
                    resolve: resolve,
                    reject: function () {
                        clearTimeout(timer);
                        reject(new Error('timer cleared'));
                    }
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

    function spawn(command, args) {
        debug('spawning %s %j', command, args);
        var child = child_process.spawn(command, args);
        debug('spawned pid %j', child.pid);
        debug('stdout %j', child.stdout.readable);
        debug('stdin %j', child.stdin.writable);

        child.on('error', function (err) {
            debug('child process error %j', err);
            //console.error(err.message);
        });
        child.on('exit', function () {
            debug('child process exited');
        });
        child.on('close', function () {
            debug('child process closed');
        });

        return new Expecto({
            input: child.stdout,
            output: child.stdin,
            child: child
        });
    }
    expecto.spawn = spawn;
})(expecto || (expecto = {}));

module.exports = expecto;
//# sourceMappingURL=expecto.js.map
