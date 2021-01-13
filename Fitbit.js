const async = require('async');
const axios = require('axios');
const qs = require('qs');

const DATE_TIME_FORMAT = 'YYYYMMDDTHH:mm:ss';

let _logger = null;

const _LOG = (msg, data) => {
    if (!_logger) {
        return;
    }

    if (_logger.error) {
        data ? _logger.error(msg, JSON.stringify(data, undefined, 3)) : _logger.error(msg);
        return;
    }

    if (typeof(_logger) === 'function') {
        data ? _logger(msg, JSON.stringify(data, undefined, 3)) : _logger(msg);
    }
};
class Fitbit {
    constructor(config) {
        this.config = config;
        this.token = null;
        if (!this.config.timeout) {
            this.config.timeout = 60 * 1000; // default 1 minute
        }
    }

    static setLogger(logger) {
        _logger = logger;
    }

    static addExpiresAt(token) {
        let now = new Date();
        now.setSeconds(now.getSeconds() + token.expires_in);
        const expires_at = now.toISOString();        
        return {...token, expires_at};
    }

    static hasTokenExpired(token) {
        if (!token.expires_at) {
            return true;
        }

        let then = new Date(token.expires_at);
        let now = new Date();
        return (now.getTime() >= then.getTime());
    }

    static handleTokenResponse(fitbit, body, cb) {
        try {
            var rawToken = typeof(body) === 'string' ? JSON.parse(body) : body;
            var token = Fitbit.addExpiresAt(rawToken);
            fitbit.setToken(token);
            return cb(null, token);
        } catch (err) {
            cb(err);
        }
    }

    authorizeURL() {        
          const { ClientCredentials, ResourceOwnerPassword, AuthorizationCode } = require('simple-oauth2');
          const config = {
            client: {
              id: this.config.creds.clientID,
              secret: this.config.creds.clientSecret
            },
            auth: {
              tokenHost: this.config.uris.authorizationUri,
              tokenPath: this.config.uris.tokenPath,
              authorizePath: this.config.uris.authorizationPath
            }
          };    
          const client = new AuthorizationCode(config);
          return client.authorizeURL(this.config.authorization_uri);
    }

    fetchToken(code = null, cb = null) {
        const self = this;
        const url = self.config.uris.tokenUri + self.config.uris.tokenPath;
        const data = qs.stringify(code ? {
            code: code,
            redirect_uri: self.config.authorization_uri.redirect_uri,
            grant_type: 'authorization_code',
            client_id: self.config.creds.clientID,
            client_secret: self.config.creds.clientSecret,
        } : {
            'grant_type': 'refresh_token',
            'refresh_token': self.token.refresh_token
        });
        const config = {
            headers: { 
                'Authorization': 'Basic ' + Buffer.from(self.config.creds.clientID + ':' + self.config.creds.clientSecret).toString('base64'),
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: self.config.timeout
        };
        const promise = axios.post(url, data, config);
        
        if (!cb) {
            return promise;
        }
        
        promise.then((response) => {
            if (response.status >= 400) {
                _LOG("Status Error:", response);
                return cb({ response: response || (code ? 'Unknown fitbit fetch token request error.' : 'Unknown fitbit refresh request error.') });
            }
            Fitbit.handleTokenResponse(self, response.data, cb);
        }).catch((error) => {
            _LOG("Token Error:", error);
            cb(new Error((code ? 'token fetch: ' : 'token refresh: ') + error.message))
        });
    }

    setToken(token) {
        this.token = token;
    }

    getToken() {
        return this.token;
    }

    refresh(cb = null) {
        return this.fetchToken(null, cb);
    }

    // The callback gets three params: err, body, token.  If token is not null, that
    // means a token refresh was performed, and the token is the new token.  If tokens
    // are persisted by the caller, the caller should persist this new token.  If the
    // token is null, then a refresh was not performed and the existing token is still valid.
    //
    request(options, cb) {
        var self = this;

        if (!self.token) {
            return cb(new Error('must setToken() or getToken() before calling request()'));
        }
        
        if (!self.token.access_token) {
            return cb(new Error('token appears corrupt: ' + JSON.stringify(self.token)));
        }

        async.series([
            function (cb) {
                if (Fitbit.hasTokenExpired(self.token)) {
                    self.refresh(cb);
                } else {
                    cb();
                }
            },
            function (cb) {
                if (!options.timeout) {
                    options.timeout = self.config.timeout;
                }

                if (!options.url && options.uri) {
                    options.url = options.uri;
                    delete options.uri;
                }
                if (!options.headers) { 
                    options.headers = {};
                }

                if (!options.headers.Authorization) {
                    options.headers.Authorization = 'Bearer ' + self.token.access_token;
                }

                const promise = axios.request(options);
                if (!cb) {
                    return promise;
                }

                promise.then((response) => {
                    self.limits = {
                        limit: response.headers['fitbit-rate-limit-limit'],
                        remaining: response.headers['fitbit-rate-limit-remaining'],
                        reset: response.headers['fitbit-rate-limit-reset'],
                    };
                    if (response.status >= 400) {
                        _LOG("Status Error:", {response});
                        return cb({ response: response || 'Unknown fitbit request error.' });
                    }
                    cb(null, response.data);
                }).catch((error) => {
                    _LOG("Error:", {error});
                    cb(new Error('request: ' + error.message));
                });
            },
        ], function (err, results) {
            if (err) {
                return cb(err);
            }
            cb(null, results[1], results[0]);
        });
    }

    getLimits() {
        return this.limits;
    }
}

module.exports = Fitbit;
