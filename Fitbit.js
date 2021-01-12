var request = require('request');
var async = require('async');

const DATE_TIME_FORMAT = 'YYYYMMDDTHH:mm:ss';
class Fitbit {
    constructor(config, persist) {
        this.config = config;
        this.token = null;
        this.persist = persist;
        if (!this.config.timeout) {
            this.config.timeout = 60 * 1000; // default 1 minute
        }
    }

    static addExpiresAt(token) {
        let now = new Date();
        now.setSeconds(now.getSeconds() + token.expires_in);
        const expires_at = now.toISOString();        
        return {...token, expires_at};
    }

    static hasTokenExpired(token) {
        let then = new Date(token.expires_at);
        let now = new Date();
        return (now.getTime() >= then.getTime());
    }

    authorizeURL() {
        return require('simple-oauth2')({
            clientID: this.config.creds.clientID,
            clientSecret: this.config.creds.clientSecret,
            site: this.config.uris.authorizationUri,
            authorizationPath: this.config.uris.authorizationPath,
        }).authCode.authorizeURL(this.config.authorization_uri);
    }

    fetchToken(code, cb) {
        var self = this;
        request({
            uri: self.config.uris.tokenUri + self.config.uris.tokenPath,
            method: 'POST',
            headers: {
                Authorization: 'Basic ' + Buffer.from(self.config.creds.clientID + ':' + self.config.creds.clientSecret).toString('base64')
            },
            timeout: self.config.timeout,
            form: {
                code: code,
                redirect_uri: self.config.authorization_uri.redirect_uri,
                grant_type: 'authorization_code',
                client_id: self.config.creds.clientID,
                client_secret: self.config.creds.clientSecret,
            }
        }, function (err, res, body) {
            if (err) {
                return cb(err);
            }
            if (res.statusCode >= 400) {
                return cb({ statusCode: res.statusCode, data: body || 'Unknown fitbit fetch token request error.' });
            }
    
            try {
                var rawToken = JSON.parse(body);
                var token = Fitbit.addExpiresAt(rawToken);
                self.token = token;
                if (!self.persist) {
                    return cb(null, token);
                }
                self.persist(self.token, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, token);
                });
            } catch (err) {
                cb(err);
            }
        });
    }

    setToken(token) {
        this.token = token;
    }

    getToken() {
        return this.token;
    }

    refresh(cb) {
        var self = this;
        request({
            uri: self.config.uris.tokenUri + self.config.uris.tokenPath,
            method: 'POST',
            headers: { 
                Authorization: 'Basic ' + Buffer.from(self.config.creds.clientID + ':' + self.config.creds.clientSecret).toString('base64') 
            },
            timeout: self.config.timeout,
            form: {
                grant_type: 'refresh_token',
                refresh_token: self.token.refresh_token
            }
        }, function (err, res, body) {
            if (err) {
                return cb(new Error('token refresh: ' + err.message));
            }
            if (res.statusCode >= 400) {
                return cb({ statusCode: res.statusCode, data: body || 'Unknown fitbit refresh request error.' });
            }
            try {
                var rawToken = JSON.parse(body);
                var token = Fitbit.addExpiresAt(rawToken);
                self.token = token;
                if (!self.persist) {
                    return cb(null, token);
                }
                self.persist(self.token, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, token);
                });
            } catch (err) {
                cb(err);
            }
        });
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
                if (!options.auth) {
                    options.auth = {};
                }
                if (!options.timeout) {
                    options.timeout = self.config.timeout;
                }
                options.auth.bearer = self.token.access_token;
                request(options, function (err, res, body) {
                    if (err) {
                        return cb(new Error('request: ' + err.message));
                    }
                    self.limits = {
                        limit: res.headers['fitbit-rate-limit-limit'],
                        remaining: res.headers['fitbit-rate-limit-remaining'],
                        reset: res.headers['fitbit-rate-limit-reset'],
                    };
                    if (res.statusCode >= 400) {
                        return cb({ statusCode: res.statusCode, data: body || 'Unknown fitbit request error.' });
                    }
                    cb(null, body);
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
