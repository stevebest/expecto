var expecto = require('../expecto');
var promise = expecto.Promise;

function echo(s) {
    return expecto.spawn('node', ['-e', 'console.log("' + s + '")']);
}

describe('expecto', function () {
    it('returns an Expecto object', function () {
        expect(expecto()).to.be.an.instanceOf(expecto.Expecto);
    });

    describe('Expecto', function () {
        var e = echo('hello');

        describe('#expect', function () {
            it('is a function', function () {
                expect(e.expect).to.be.a.function;
            });
            it('has 2 arguments', function () {
                expect(e.expect).to.have.length(2);
            });
            it('returns a Promise', function () {
                expect(e.expect(/foo/)).to.be.an.instanceOf(Promise);
            });
        });

        describe('#timeout', function () {
            it('is a function', function () {
                expect(e.timeout).to.be.a.function;
            });
            it('has 2 arguments', function () {
                expect(e.timeout).to.have.length(2);
            });
            it('returns a Promise', function () {
                expect(e.timeout()).to.be.an.instanceOf(Promise);
            });
        });
    });
});

describe('Parallel expectations', function () {
    describe('on input "ab"', function () {
        it('expect(/a/); expect(/b/); should match /a/, but not /b/', function () {
            var e = echo('ab');
            return Promise.all([
                expect(e.expect(/a/)).to.be.fulfilled,
                expect(e.expect(/b/)).to.be.rejected
            ]);
        });

        it('expect(/b/); expect(/a/); should match /b/, but not /a/', function () {
            var e = echo('ab');
            return Promise.all([
                expect(e.expect(/b/)).to.be.fulfilled,
                expect(e.expect(/a/)).to.be.rejected
            ]);
        });
    });
});

describe('Sequential expectations:', function () {
    describe('on input "ab"', function () {
        it('should match /a/, then should match /b/', function () {
            var e = echo('ab');
            return expect(e.expect(/a/)).to.be.fulfilled.then(function () {
                return expect(e.expect(/b/)).to.be.fulfilled;
            });
        });
    });

    describe('on input "abc"', function () {
        it('should match /a/, then /b/, but not /c/, and then /C/i', function () {
            var e = echo('abc');
            return expect(e.expect(/a/)).to.be.fulfilled.then(function () {
                return Promise.all([
                    expect(e.expect(/b/)).to.be.fulfilled,
                    expect(e.expect(/c/)).to.be.rejected
                ]).then(function () {
                    return expect(e.expect(/C/i)).to.be.fulfilled;
                });
            });
        });
    });
});

describe('Timeout:', function () {
    describe('on input "a"', function () {
        var e = null;
        beforeEach(function () {
            e = echo('a');
        });

        it('not expecting anything should timeout', function () {
            return expect(e.timeout(100)).to.be.fulfilled;
        });

        it('expecting /b/ should time out', function () {
            return expect(e.expect(/b/)).to.be.rejectedWith(/timed out/);
        });

        it('expecting /a/ should not timeout', function () {
            return Promise.all([
                expect(e.expect(/a/)).to.be.fulfilled,
                expect(e.timeout()).to.be.rejectedWith(/expectation matched/)
            ]);
        });
    });
});
//# sourceMappingURL=test.js.map
