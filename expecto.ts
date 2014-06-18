var Promise = require('bluebird');
var debug = require('debug')('expecto');
import child_process = require('child_process');

function expecto(options: expecto.ExpectoOptions = { input: process.stdin, output: process.stdout }): expecto.Expecto {
    return new expecto.Expecto(options);
}

module expecto {
    export interface ExpectoOptions {
        input: ReadableStream;
        output: WritableStream;
        encoding?: string;
        name?: string;
        child?: child_process.ChildProcess;
    }

    interface Expectation {
        pattern?: RegExp;
        timer?: number;
        promise: Promise<Match>;
        resolve: (m: Match) => any;
        reject: Function;
    }

    export interface Match {
        buffer: string
        matches: RegExpExecArray
    }

    function expect(pattern: RegExp): Expectation {
        var resolve, reject;
        var promise = new Promise<Match>(function () {
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

    export class Expecto {
        public name: string;

        private input: ReadableStream;
        private output: WritableStream;

        private encoding: string;

        private child: child_process.ChildProcess;

        private buffer = "";
        private expectations: Expectation[] = [];
        private eofExpectation: Expectation;
        private timeoutExpectation: Expectation;

        private matchPending = false;

        /**
         * A promise which will fulfill when one of the patterns is encountered
         */
        private promise: Promise<Match>;

        /**
         * A promise which fullfills when `input` stream emits `end` event
         */
        public eof: Promise<{}>;

        constructor(options: ExpectoOptions) {
            this.name = options.name || 'expecto';
            this.input = options.input;
            this.output = options.output;
            this.encoding = options.encoding || 'utf8';
            this.child = options.child;

            this.input.on('data', (data: NodeBuffer) => {
                this.buffer += data.toString(this.encoding);
                this.match();
            });

            this.reset();
        }

        private reset() {
            // TODO Clear eof expectation
            debug('reset');
            this.expectations = [];
        }

        private match() {
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
        }

        /** Rejects all expectations */
        private reject(err: Error) {
            for (var i = 0; i < this.expectations.length; i++) {
                debug('rejecting %s', this.expectations[i].pattern);
                this.expectations[i].reject(err);
            }

            // Clear timeout
            this.timeoutExpectation && this.timeoutExpectation.reject();
            this.timeoutExpectation = null;
        }

        expect(pattern: RegExp): Promise<Match> {
            debug('expecting %s', pattern);
            var expectation = expect(pattern);
            this.expectations.push(expectation);

            if (!this.matchPending) {
                this.matchPending = true;
                process.nextTick(this.match.bind(this));
            }

            return expectation.promise;
        }

        timeout(ms: number = 1000): Promise<{}> {
            var resolve, reject, timer, promise;

            if (!this.timeoutExpectation) {
                promise = new Promise<{}>(() => {
                    resolve = arguments[0];
                    reject = arguments[1];
                    timer = setTimeout(() => {
                        this.reject(new Error('timed out'));
                        resolve();
                    }, ms);
                });

                this.timeoutExpectation = {
                    timer: timer,
                    promise: promise,
                    resolve: resolve,
                    reject: () => {
                        clearTimeout(timer);
                        reject(new Error('timer cleared'));
                    }
                };
            }

            return promise;
        }

        send(str: string) {
            debug('send %j', str);
            this.output.write(str);
        }
    }

    export function spawn(command: string, args?: string[]): Expecto {
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
}

export = expecto;
