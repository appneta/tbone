/**
 * scheduler/drainqueue.js
 */

var nextId = 1;
/**
 * Generate and return a unique identifier which we attach to an object.
 * The object is typically a view, model, or scope, and is used to compare
 * object references for equality using a hash Object for efficiency.
 * @param  {Object} obj Object to get id from ()
 * @return {string}     Unique ID assigned to this object
 */
function uniqueId(obj) {
    if (!obj.tboneid) {
        obj.tboneid = nextId++;
    }
    return obj.tboneid;
}

/**
 * List of Scopes to be executed immediately.
 * @type {Array.<Scope>}
 */
var schedulerQueue = [];

/**
 * Flag indicating that the schedulerQueue is unsorted.
 * @type {Boolean}
 */
var dirty;

/**
 * Hash map of all the current Scope uniqueIds that are already
 * scheduled for immediate execution.
 * @type {Object.<string, Boolean>}
 */
var scopesQueued = {};

/**
 * Pop the highest priority Scope from the schedulerQueue.
 * @return {Scope} Scope to be executed next
 */
function pop() {
    /**
     * The schedulerQueue is lazily sorted using the built-in Array.prototype.sort.
     * This is not as theoretically-efficient as standard priority queue algorithms,
     * but Array.prototype.sort is fast enough that this should work well enough for
     * everyone, hopefully.
     */
    if (dirty) {
        schedulerQueue.sort(function (a, b) {
            /**
             * TODO for sync models, use dependency graph in addition to priority
             * to order execution in such a way as to avoid immediate re-execution.
             */
            return a.priority - b.priority;
        });
        dirty = false;
    }
    return schedulerQueue.pop();
}

/**
 * Flag indicating whether a drainQueue timer has already been set.
 */
var drainQueueTimer;

/**
 * Dynamic counter of how many ajax requests are inflight.
 * @type {Number}
 */
var inflight = {};

function addInFlight (model) {
    var id = model.tboneid;
    if (!inflight[id]) {
        inflight[id] = model;
        metrics.increment('ajax.numReqStarted');
        updateIsReady();
    }
}

function removeInFlight (model) {
    var id = model.tboneid;
    if (inflight[id]) {
        delete inflight[id];
        metrics.increment('ajax.numReqFinished');
        updateIsReady();
    }
}

tbone.isReady = function () {
    return metrics.query('isReady');
};

var isReadyTimer;
function updateIsReady () {
    if (!isReadyTimer) {
        isReadyTimer = setTimeout(function () {
            var numInFlight = _.keys(inflight).length;
            metrics.query('isReady', _.isEmpty(inflight) && !drainQueueTimer);
            metrics.query('ajax.modelsInFlight', _.clone(inflight));
            metrics.query('ajax.isReady', numInFlight === 0);
            metrics.query('ajax.numInFlight', numInFlight);
            isReadyTimer = null;
        }, 20);
    }
}

/**
 * Queue the specified Scope for execution if it is not already queued.
 * @param  {Scope}   scope
 */
function queueExec (scope) {
    var contextId = uniqueId(scope);
    if (!scopesQueued[contextId]) {
        scopesQueued[contextId] = true;

        /**
         * Push the scope onto the queue of scopes to be executed immediately.
         */
        schedulerQueue.push(scope);

        /**
         * Mark the queue as dirty; the priority of the scope we just added
         * is not immediately reflected in the queue order.
         */
        dirty = true;

        /**
         * If a timer to draing the queue is not already set, set one.
         */
        if (!drainQueueTimer && !(TBONE_DEBUG && frozen)) {
            updateIsReady();
            drainQueueTimer = _.defer(drainQueue);
        }
    }
}

var frozen = false;

function runListOfFunctions (list) {
    _.each(list, function (cb) { cb(); });
}

/**
 * Drain the Scope execution queue, in priority order.
 */
function drainQueue () {
    var queueDrainStartTime = now();
    var scope;
    drainQueueTimer = null;
    drainQueueTimer = schedulerQueue.length ? _.defer(drainQueue) : null;
    var remaining = 5000;
    while (!(TBONE_DEBUG && frozen) && --remaining && !!(scope = pop())) {
        /**
         * Update the scopesQueued map so that this Scope may be requeued.
         */
        delete scopesQueued[uniqueId(scope)];

        /**
         * Execute the scope, and in turn, the wrapped function.
         */
        scope.execute();
    }
    if (TBONE_DEBUG) {
        if (!remaining) {
            log(WARN, 'scheduler', 'drainQueueOverflow', 'exceeded max drainQueue iterations');
        }
        log(VERBOSE, 'scheduler', 'drainQueue', 'ran for <%=duration%>ms', {
            duration: now() - queueDrainStartTime
        });
    }
    updateIsReady();
}

/**
 * Drain to the tbone drainQueue, executing all queued Scopes immediately.
 * This is useful both for testing and MAYBE also for optimizing responsiveness by
 * draining at the end of a keyboard / mouse event handler.
 */
var drain = tbone.drain = function () {
    if (drainQueueTimer) {
        clearTimeout(drainQueueTimer);
    }
    drainQueue();
};

if (TBONE_DEBUG) {
    tbone.freeze = function () {
        frozen = true;
    };
}
