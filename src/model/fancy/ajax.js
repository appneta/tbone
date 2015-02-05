/**
 * model/fancy/ajax.js
 */

models['ajax'] = asyncModel.extend({

    'state': function (dataCallback) {
        var self = this;
        var myXhr;
        function complete () {
            removeInFlight(self);
            if (myXhr) {
                myXhr = null;
            }
            self['onComplete']();
        }

        var url = isString(self.url) ? self.url : self.url();
        if (url == null) {
            dataCallback(null);
        } else {
            /**
             * If a defined URL function returns null, it will prevent fetching.
             * This can be used e.g. to prevent loading until all required
             * parameters are set.
             **/
            self.fetchedUrl = url;
            self['abortPrevious']();
            if (self['clearOnFetch']) {
                self.clear();
            }
            addInFlight(self);
            var onData = function (str) {
                /**
                 * dataCallback returns true if this update was accepted (i.e.
                 * is of the current async update generation).  So only fire
                 * the postFetch callback, etc, when the update actually sticks.
                 */
                if (dataCallback(self.parse(str))) {
                    self['postFetch']();
                    self.trigger('fetch');
                    log(INFO, self, 'updated', self.attributes);
                }
            };
            sync('read', self, {
                'dataType': self['dataType'],
                'success': onData,
                'error': function (xhr) {
                    onData(xhr && xhr.responseText);
                },
                'complete': complete,
                'beforeSend': function (xhr) {
                    myXhr = xhr;
                },
                'url': url
            });
        }
        return {
            onAbort: function () {
                // If we have an active XHR in flight, we should abort
                // it because we don't want that anymore.
                log(WARN, self, 'abort',
                    'aborting obsolete ajax request. old url: <%=oldurl%>', {
                    'oldurl': self.fetchedUrl
                });
                if (myXhr) {
                    myXhr.abort();
                }
                complete();
            }
        };
    },

    'parse': identity,

    /**
     * By default, async models will use $.ajax to fetch data; override this
     * with something else if desired.
     */
    'ajax': function () {
        return $.ajax.apply($, arguments);
    },

    'postFetch': noop,

    'onComplete': noop,

    'clearOnFetch': true, // XXX move to async model

    'sleepEnabled': true,

    'dataType': 'json'

});
