import readline = require('readline');

var Promise = require('bluebird');

var rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

function ask(question) {
    return new Promise(function (fulfill, reject) {
        process.stdout.write('What...');
        setTimeout(function () {
            process.stdout.write(' is ');
            rl.question(question + '?\n', fulfill);
        }, 1000);
    });
}

ask('your name')
    .then(function (name) {
        return ask('your quest');
    })
    .then(function (quest) {
        return ask('your favourite colour');
    })
    .finally(function (colour) {
        console.log('Go on. Off you go.');
        rl.close();
        //process.stdout.end();
    });
