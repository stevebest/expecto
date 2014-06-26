# expecto

See patterns in streams of data, send other data back.


## Why?

For the same reasons \*nix `expect` utility exists. Control interactive applications, parse data that is hard to parse using traditional techniques, and more.


## Usage

`expecto` reacts to data coming from an input stream and tries to match it against a set of patterns you give to it. When a pattern matches, it fulfills a promise it gave you. If pattern could not be matched &mdash; because of timeout, end of stream, or matching another pattern &mdash; the promise will be rejected.

```js
var e = expecto();
e.expect(/hello/).then(function (match) {
    e.send('hi');
});
```


### Sequential expectations

`Promise`s are natural for expressing chains of actions. This is how you first wait for `a`, and then `b`, and then `c`:

```js
var e = expecto();
e.expect(/a/)
    .then(function () {
        return e.expect(/b/);
    })
    .then(function () {
        return e.expect(/c/);
    });
```

Maybe this looks kinda strange, because `.expect(/a/)` is indented differently from `.expect(/b/)` and `.expect(/c/)`. If you are OCD like that, try:

```js
var e = expecto();
Promise.resolve()
    .then(function () {
        return e.expect(/a/)
    })
    .then(function () {
        return e.expect(/b/);
    })
    .then(function () {
        return e.expect(/c/);
    });
```


### Concurrent expectations

Sometimes you expect to see more than one possible pattern to occur. For example, at some point in data one of `/a/`, `/b/` or `/c/` may match, and you want very different actions taken for each of them. This is how you handle it:

```js
var e = expecto();
e.expect(/a/).then(function () { console.log('a won'); });
e.expect(/b/).then(function () { console.log('a and c lost'); });
e.expect(/c/).then(function () { console.log('i can c you'); });
```


### Joining on concurrent expectations

Suppose we expect either `/a/` or `/b/`, but what follows them should be `/z/`. You can use standard `Promise.race` to join on first two concurrent expectations, and then wait for third.

```js
Promise.race([
    e.expect(/a/),
    e.expect(/b/)
]).finally(function () {
    return e.expect(/z/);
});
```

Because one of two expectations will be rejected, we use `.finally` here.


### Loops

When you expect the same pattern over and over, until some other pattern occurs, you can use something like this:

```js
function aaaaaaz() {
    return new Promise(function (fulfill, reject) {
        function loop() {
            e.expect(/a/)
                .then(doSomethingWithA)
                .then(loop);

            e.expect(/z/).then(fulfill);
        }

        loop();
    });
}

aaaaaaz().then(/* ... */);
```

Given the input `aardvark zoo`, the `aaaaaaz()` would call `doSomethingWithA` three times, and then "exit" the loop, leaving the remaining `oo` in the buffer.


### "But I hate Promises and want my pyramide of doom back!"

*Sigh.* Alright. You can pass Node style callbacks to methods of `Expecto`, and they will be called with `cb(err, match)` parameters.


## API

* **expecto**(options)
* expecto.**Promise**
* expecto.**spawn**(command[, arguments[, options]])
* **Expecto**.prototype
  * .**expect**(pattern)
  * .**timeout**(ms)

### `expecto(options)`

`expecto` creates `Expecto` objects that read data from `options.input` ReadableStream and send replies into an `options.output` WritableStream. Default values for those are `process.stdin` and `process.stdout`. Those could be *any* kind of Node stream: TTY, file, HTTP, etc.

Example:
```js
var input = process.stdin;
var output = fs.createWriteStream('out.txt');
var e = expecto({ input: input, output: output });
```


### `expecto.Promise`

A constructor function that is used to create promises returned by `.expect()` and others.

`expecto` is built around awesome `bluebird` promises.


### `expecto.spawn(command[, arguments[, options]])`

Spawn a child process expecting data from its `stdout` and replying to `stdin`.


### `Expecto.prototype.expect(pattern)`

Returns an expectation &mdash; a `Promise` which will be fulfilled as soon as `pattern` is encountered in `input`.

The expectation will be rejected if:

1. a concurrent expectation matches instead;
2. expectation times out;
3. an end of data is reached and `pattern` is not there.

Example:
```js
e.expect(/something/).then(function (match) {
    console.log('`something` found');
}, function (err) {
    console.error('`something` is not found :(');
});
```

`.expect()` implicitly starts a default `.timeout()` timer if there isn't one already. Meeting an expectation will clear the timeout.


### `Expecto.prototype.timeout(ms)`

Returns an expectation which will be fulfilled after `ms` milliseconds &mdash; but only if a none of concurrent expectations fulfill during this period. In latter case, the promise rejects.

Example:
```js
e.expect(/foo/).then(function () {
    console.log('`foo` found');
});
e.timeout(1000).then(function () {
    console.error('a whole second passed, but there is still no `foo`');
});
```


## LICENSE

The MIT License (MIT)

Copyright &copy; 2014 Stepan Stolyarov

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
