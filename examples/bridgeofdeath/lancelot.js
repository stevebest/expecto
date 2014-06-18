var expecto = require('../../expecto');

var keeper = expecto.spawn('node', [__dirname + '/keeper.js']);

keeper.expect(/name.*/).then(function () {
    keeper.send('Lancelot\n');
    return keeper.expect(/quest.*/);
}).then(function () {
    keeper.send('I seek the Holy Grail\n');
    return keeper.expect(/colour.*/);
}).then(function () {
    keeper.send('Blue\n');
    return keeper.expect(/Go on/);
}).then(function () {
    keeper.send('Oh. Thank you.');
});
//# sourceMappingURL=lancelot.js.map
