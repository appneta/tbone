var T = require('../tbone').make();
var tbone = T;
var _ = require('lodash');

exports['tbone id queries'] = function(test) {
  var coll = tbone.collections.base.make();
  var me = tbone.models.base.make();
  me('coll', coll);
  coll.add({
    id: 7,
    name: 'bob'
  });
  var model2 = tbone.models.base.make();
  model2.query('', {
    id: 2,
    name: 'susan'
  })
  coll.add(model2);
  coll.add({
    id: 42,
    name: 'sally'
  });
  test.equal(me('coll.#2.name'), 'susan');
  var name42;
  T(function() {
    name42 = me('coll.#42.name');
  });
  var name0;
  T(function() {
    name0 = me('coll.#0.name');
  });
  var len;
  T(function() {
    len = coll('size');
  });
  test.equal(name42, 'sally');
  coll('#42.name', 'polly');
  test.equal(name42, 'sally');
  T.drain();
  test.equal(len, 3);
  test.equal(name42, 'polly');
  me('coll.#42', {
    id: 0,
    name: 'robert'
  });
  test.equal(name42, 'polly');
  T.drain();
  test.equal(name42, undefined);
  test.equal(name0, 'robert');

  // Test adding an unidentified model, then setting its ID
  var count = _.keys(me('coll')).length;
  var john = tbone.models.base.make();
  john('name', 'john');
  coll.add(john);
  T.drain();
  test.equal(len, 4);
  test.equal(me('coll.size'), 4);
  test.equal(_.keys(me('coll')).length, count + 1);
  john('id', 'awesome');
  T.drain();
  test.equal(me('coll.#awesome.name'), 'john');

  // Test removing a model by model instance
  coll.remove(model2);
  test.equal(_.keys(me('coll')).length, count);
  test.equal(coll('#2.name'), undefined);

  // Test removing a non-existent model by id
  coll.remove(42);
  test.equal(_.keys(me('coll')).length, count);

  // Test removing a model by model by id
  coll.remove(0);
  test.equal(_.keys(me('coll')).length, count - 1);
  test.equal(coll('#0.name'), undefined);

  test.equal(len, 4);
  T.drain();
  test.equal(len, 2);
  test.done();
};


exports['async model'] = function(test) {
  test.expect(3);

  var src = tbone.make();
  src('prop', 42);
  var me = tbone.models.async.make(function(cb) {
    var val = src('prop');
    setTimeout(function() {
      cb({
        'asyncprop': val
      });
      _.defer(sync);
    }, 10);
  });
  test.equal(me('asyncprop'), undefined);
  var numUpdates = 0;

  function sync() {
    numUpdates++;
    if (numUpdates === 1) {
      test.equal(me('asyncprop'), 42);
      src('prop', 100);
    } else {
      test.equal(me('asyncprop'), 100);
      test.done();
    }
  }
};

exports['async model abort'] = function(test) {
  test.expect(1);
  var src = tbone.make();
  src('prop', 42);
  var me = tbone.models.async.make(function(cb) {
    src('prop');
    this.abortPrevious();
    return {
      onAbort: function() {
        test.ok(true, 'called onAbort');
        test.done();
      }
    }
  });
  setTimeout(function() {
    src('prop', 36);
  }, 0);
};

exports['async model with rolling update'] = function(test) {
  var callbacks = [];
  var me = tbone.make();
  var model = tbone.models.async.make({
    state: function(cb) {
      me('prop');
      callbacks.push(cb);
    }
  });
  test.equal(callbacks.length, 1);
  test.equal(model(''), undefined);
  me('prop', 1);
  T.drain();
  me('prop', 2);
  T.drain();
  test.equal(callbacks.length, 3);
  callbacks[0]('hello'); // accepted - newer generation than last update
  test.equal(model(''), 'hello');

  callbacks[2]('yo');
  test.equal(model(''), 'yo');

  callbacks[1]('hi'); // rejected - old generation
  test.equal(model(''), 'yo');
  test.done()
};

var ajaxBase = T.models.ajax.make({
  url: '/',
  ajax: function (opts) {
    var self = this;
    setTimeout(function () {
      var data = self.successData || self.errorData;
      if (self.successData) {
        opts.success(data);
      } else {
        opts.error(data);
      }
      if (opts.complete) {
        opts.complete(data);
      }
    }, self.delay);
  },
  delay: 0,
});

function failAfterTimeout(test, timeout) {
  var origDone = test.done;
  var timer = setTimeout(function() {
    test.fail('timed out after ' + timeout + 'ms');
    origDone();
  }, timeout);
  test.done = function() {
    clearTimeout(timer);
    origDone.call(test);
  };
}

exports['ajax model stuff'] = function(test) {
  test.expect(5);
  var me = ajaxBase.make({
    successData: { hello: 'world' },
  });
  var firstRun = true;
  T({
    fn: function() {
      if (firstRun) {
        test.equal(me('hello'), undefined);
        test.equal(me.sleeping, true);
        firstRun = false;
      } else {
        test.equal(me('hello'), 'world');
        test.equal(me().hello, 'world');
        test.equal(me.sleeping, false);
        test.done();
      }
    },
    isView: true,
  });
  failAfterTimeout(test, 100);
};

exports['ajax hold while url is null'] = function(test) {
  var me = T.models.ajax.make({
    url: function() {
      return null;
    },
    ajax: function() {
      test.fail('should not call model.ajax');
    },
  });
  test.equal(me.sleeping, true);
  T({
    fn: function() {
      test.equal(me(), undefined);
    },
    isView: true,
  });
  T.drain();
  test.equal(me(), undefined);
  test.equal(me.sleeping, false);
  test.done();
};

exports['wake with circular dependencies'] = function(test) {
  var me = T.make();
  me('bound1', tbone.models.bound.make({
    state: function() {
      return {
        prop: me('bound2.prop'),
      };
    },
    sleepEnabled: false,
  }));
  me('bound2', tbone.models.bound.make({
    state: function() {
      return {
        prop: me('bound3.prop'),
      };
    },
    sleepEnabled: true,
  }));
  me('bound3', tbone.models.bound.make({
    state: function() {
      return {
        prop: 'hello',
        bound1: me('bound1.prop'),
      };
    },
    sleepEnabled: true,
  }));
  me('bound4', tbone.models.bound.make({
    state: function() {
      return 'hi';
    },
    sleepEnabled: true,
  }))
  me('firstprop', function() {
    return me('bound1.prop');
  });
  T.drain();
  test.equal(me.queryModel('bound1').sleeping, false);
  test.equal(me.queryModel('bound2').sleeping, true);
  test.equal(me.queryModel('bound3').sleeping, true);
  test.equal(me.queryModel('bound4').sleeping, true);
  test.equal(me('firstprop'), undefined);
  // Test resiliency also with attempting to wake destroyed models
  me.queryModel('bound4').destroy();
  T({
    fn: function() {
      me('bound1.prop');
      me('bound4');
    },
    isView: true,
  });
  T.drain();
  test.equal(me.queryModel('bound1').sleeping, false);
  test.equal(me.queryModel('bound2').sleeping, false);
  test.equal(me.queryModel('bound3').sleeping, false);
  test.equal(me('firstprop'), 'hello');
  test.done();
};
