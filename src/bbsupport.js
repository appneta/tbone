
if (window['Backbone']) {

    var bblookup = function (flag, query, value) {
        var isSet;
        var dontGetData = flag === DONT_GET_DATA;
        var iterateOverModels = flag === ITERATE_OVER_MODELS;
        if (typeof flag !== 'number') {
            /**
             * If no flag provided, shift the query and value over.  We do it this way instead
             * of having flag last so that we can type-check flag and discern optional flags
             * from optional values.  And flag should only be used internally, anyway.
             */
            value = query;
            query = flag;
            flag = null;
            /**
             * Use arguments.length to switch to set mode in order to properly support
             * setting undefined.
             */
            if (arguments.length === 2) {
                isSet = true;
            }
        }

        /**
         * Remove a trailing dot and __self__ references, if any, from the query.
         **/
        query = (query || '').replace(/\.?(__self__)?\.?$/, '');
        var args = query.split('.');

        var setprop;
        if (isSet) {
            /**
             * For set operations, we only want to look up the parent of the property we
             * are modifying; pop the final property we're setting from args and save it
             * for later.
             * @type {string}
             */
            setprop = args[args.length - 1];
        }

        /**
         * If this function was called with a bindable context (i.e. a Model or Collection),
         * then use that as the root data object instead of the global tbone.data.
         */
        var last_data;
        var _data = this.isCollection ? this.models : this.attributes;
        var name_parts = [];
        var myRecentLookup = {};
        var firstprop = args[0] || '';
        var firstdata = query ? _data[firstprop] : _data;
        var id;
        var arg;
        var doSubLookup;

        while ((arg = args.shift()) != null) {
            // Ignore empty string arguments.
            if (arg === QUERY_SELF) {
                continue;
            }

            name_parts.push(arg);
            last_data = _data;
            _data = _data[arg];

            if (_data == null) {
                if (isSet) {
                    /**
                     * When doing an implicit mkdir -p while setting a deep-nested property
                     * for the first time, we peek at the next arg and create either an array
                     * for a numeric index and an object for anything else.
                     */
                    _data = rgxNumber.exec(args[0]) ? [] : {};
                    last_data[arg] = _data;
                } else {
                    break;
                }
            } else if (_data['isBindable']) {
                doSubLookup = true;
                break;
            }
        }

        if (!isSet && recentLookups) {
            id = uniqueId(this);
            myRecentLookup = recentLookups[id] = (recentLookups && recentLookups[id]) || {
                '__obj__': this
            };
            myRecentLookup[firstprop] = firstdata;
        }

        // Skip the sub-query if DONT_GET_DATA is set there are no more args
        if (doSubLookup && (!dontGetData || args.length)) {
            return isSet ? _data['query'](args.join('.'), value) : _data['query'](flag, args.join('.'));
        }

        if (_data) {
            if (isSet) {
                if (last_data == null) {
                    // Set top-level of model/collection
                    /**
                     * When setting to an entire model, we use different semantics; we want the
                     * values provided to be set to the model, not replace the model.
                     */
                    if (this.isCollection) {
                        this.reset(value != null ? value : []);
                    } else {
                        if (value) {
                            /**
                             * Remove any properties from the model that are not present in the
                             * value we're setting it to.
                             */
                            for (var k in this.toJSON()) {
                                if (value[k] === undefined) {
                                    this.unset(k);
                                }
                            }
                            this.set(value);
                        } else {
                            this.clear();
                        }
                    }
                } else if (last_data[setprop] !== value) {
                    /**
                     * Set the value to a property on a regular JS object.
                     */
                    last_data[setprop] = value;
                    /**
                     * If we're setting a nested property of a model (or collection?), then
                     * trigger a change event for the top-level property.
                     */
                    if (firstprop) {
                        this.trigger('change:' + firstprop);
                    }
                    this.trigger('change');
                }
                return _data;
            } else if (!iterateOverModels && this.isCollection && query === '') {
                /**
                 * If iterateOverModels is not set and _data is a collection, return the
                 * raw data of each model in a list.  XXX is this ideal?  or too magical?
                 */
                _data = _.map(_data, function (d) { return d['query'](); });
            }
        }
        return _data;
    };

    var bbbaseModel = Backbone.Model.extend({
        isModel: true,
        /**
         * Constructor function to initialize each new model instance.
         * @return {[type]}
         */
        initialize: function () {
            var self = this;
            uniqueId(self);
            var isAsync = self.sleeping = self.isAsync();
            var priority = isAsync ? BASE_PRIORITY_MODEL_ASYNC : BASE_PRIORITY_MODEL_SYNC;
            /**
             * Queue the autorun of update.  We want this to happen after the current JS module
             * is loaded but before anything else gets updated.  We can't do that with setTimeout
             * or _.defer because that could possibly fire after processQueue.
             */
            queueExec({
                execute: function () {
                    self.scope = autorun(self.update, self, priority, 'model_' + self.Name,
                                         self.onScopeExecute, self);
                },
                priority: priority + PRIORITY_INIT_DELTA
            });
        },
        /**
         * Indicates whether this function should use the asynchronous or
         * synchronous logic.
         * @return {Boolean}
         */
        isAsync: function () {
            return !!this['_url'];
        },
        onScopeExecute: function (scope) {
            log(INFO, this, 'lookups', scope.lookups);
        },
        /**
         * Triggers scope re-execution.
         */
        reset: function () {
            if (this.scope) {
                this.scope.trigger();
            }
        },
        'isVisible': function () {
            return hasViewListener(this);
        },
        update: function () {
            var self = this;
            if (self.isAsync()) {
                self.updateAsync();
            } else {
                self.updateSync();
            }
        },
        updateAsync: function () {
            var self = this;
            var expirationSeconds = self['expirationSeconds'];
            function complete() {
                inflight--;
                delete self.__xhr;
                if (expirationSeconds) {
                    if (self.expirationTimeout) {
                        clearTimeout(self.expirationTimeout);
                    }
                    self.expirationTimeout = setTimeout(function () {
                        self.reset();
                    }, expirationSeconds * 1000);
                }
            }

            var url = self.url();
            var lastFetchedUrl = self.fetchedUrl;
            self.sleeping = !this['isVisible']();
            if (self.sleeping) {
                /**
                 * Regardless of whether url is non-null, this model goes to sleep
                 * if there's no view listener waiting for data (directly or through
                 * a chain of other models) from this model.
                 **/
                log(INFO, self, 'sleep');
                self.sleeping = true;
            } else if (url != null && (expirationSeconds || url !== lastFetchedUrl)) {
                /**
                 * If a defined URL function returns null, it will prevent fetching.
                 * This can be used e.g. to prevent loading until all required
                 * parameters are set.
                 **/
                self.fetchedUrl = url;
                self.clear();
                inflight++;
                self.fetch({
                    'dataType': 'text',
                    success: function () {
                        self['postFetch']();
                        self.trigger('fetch');
                        log(INFO, self, 'updated', self.toJSON());
                        complete();
                    },
                    error: function () {
                        complete();
                    },
                    'beforeSend': function (xhr) {
                        // If we have an active XHR in flight, we should abort
                        // it because we don't want that anymore.
                        if (self.__xhr) {
                            log(WARN, self, 'abort',
                                'aborting obsolete ajax request. old: <%=oldurl%>, new: <%=newurl%>', {
                                'oldurl': lastFetchedUrl,
                                'newurl': url
                            });
                            self.__xhr.abort();
                        }
                        self.__xhr = xhr;
                        xhr['__backbone__'] = true;
                    },
                    url: url
                });
            }
        },
        updateSync: function () {
            var self = this;
            // this.state returns the new state, synchronously
            var newParams = self['state']();
            if (newParams === null) {
                log(VERBOSE, self, 'update cancelled');
                return;
            }
            self['lookup'](QUERY_SELF, newParams);
            log(INFO, self, 'updated', self.toJSON());
        },
        'state': noop,
        'postFetch': noop
    });

    _.each([Backbone.Model.prototype, Backbone.Collection.prototype], function (proto) {
        _.extend(proto, {
            /**
             * isBindable is just a convenience used to identify whether an object is
             * either a Model or a Collection.
             */
            'isBindable': true,
            'isBackbone': true,

            /**
             * Copy query and text onto the Model, View, and Collection.
             *
             */
            'query': bblookup,
            'text': lookupText,

            // deprecated?
            'lookup': bblookup,
            'lookupText': lookupText,

            /**
             * Wake up this model as well as (recursively) any models that depend on
             * it.  Any view that is directly or indirectly depended on by the current
             * model may now be able to be awoken based on the newly-bound listener to
             * this model.
             * @param  {Object.<string, Boolean>} woken Hash map of model IDs already awoken
             */
            wake: function (woken) {
                // Wake up this model if it was sleeping
                if (this.sleeping) {
                    this.trigger('wake');
                    this.sleeping = false;
                    this.reset();
                }
                /**
                 * Wake up models that depend directly on this model that have not already
                 * been woken up.
                 */
                _.each((this.scope && this.scope.lookups) || [], function (lookup) {
                    var bindable = lookup.__obj__;
                    if (bindable && !woken[uniqueId(bindable)]) {
                        woken[uniqueId(bindable)] = true;
                        bindable.wake(woken);
                    }
                });
            }
        });

        /**
         * We wrap proto.on in order to wake up and reset models
         * that were previously sleeping because they did not need to be updated.
         * This passes through execution to the original on function.
         */
        var originalOn = proto.on;
        proto['on'] = function () {
            this.wake({});
            return originalOn.apply(this, arguments);
        };
    });

    var bbModel = models['bbbase'] = bbbaseModel;
    var bbCollection = collections['bbbase'] = Backbone.Collection.extend({
        isCollection: true
    });

    _.each([bbModel, bbCollection], function (obj) {
        _.extend(obj.prototype, {
            /**
             * Disable backbone-based validation; by using validation to prevent populating
             * form input data to models, backbone validation is at odds with the TBone
             * concept that all data in the UI should be backed by model data.
             *
             * By overriding _validate, we can still use isValid and validate, but Backbone
             * will no longer prevent set() calls from succeeding with invalid data.
             */
            '_validate': function () { return true; }
        });

        // XXX This won't work with extending models
        obj.make = function (opts) {
            return new this(opts);
        };
    });
}