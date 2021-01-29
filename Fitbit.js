const axios = require('axios');
const qs = require('qs');
const FileTokenManager = require("./FileTokenManager");

const JSON_IDENT = 3;
const DEFAULT_TIMEOUT = 60000; // 1 minute
const SUBSTRACT_MILLIS = 60000; // 1 minute

let _logger = null;

const _LOG_ERROR = (msg, data) => {
    if (!_logger) {
        return;
    }

    if (_logger.error) {
        data ? _logger.error(msg, JSON.stringify(data, undefined, JSON_IDENT)) : _logger.error(msg);
        return;
    }

    if (typeof(_logger) === 'function') {
        data ? _logger(msg, JSON.stringify(data, undefined, JSON_IDENT)) : _logger(msg);
    }
};

const _LOG_DEBUG = (msg, data) => {
    if (!_logger) {
        return;
    }

    if (_logger.debug) {
        data ? _logger.debug(msg, JSON.stringify(data, undefined, JSON_IDENT)) : _logger.debug(msg);
        return;
    }

    if (typeof(_logger) === 'function') {
        data ? _logger(msg, JSON.stringify(data, undefined, JSON_IDENT)) : _logger(msg);
    }
};

const _LOG_INFO = (msg, data) => {
    if (!_logger) {
        return;
    }

    if (_logger.info) {
        data ? _logger.info(msg, JSON.stringify(data, undefined, JSON_IDENT)) : _logger.info(msg);
        return;
    }

    if (typeof(_logger) === 'function') {
        data ? _logger(msg, JSON.stringify(data, undefined, JSON_IDENT)) : _logger(msg);
    }
};

class Fitbit {
    constructor(config, tokenManager = null) {
        if (!config) {
            throw new Error('Config expected');
        }

        if (!tokenManager ) {
            if (!config.tokenFilePath) {
                throw new Error('Make sure config has property \'tokenFilePath\' defined or provide a token persist manager');
            }
            tokenManager = new FileTokenManager(config.tokenFilePath);
        }

        if (!tokenManager.read || !tokenManager.write) {
            throw new Error('Token perist manager must define methods read and write');
        }

        this._config = {...config};
        this._tokenManager = tokenManager;
        this._token = null;
        this._isTokenRefreshingOrInitiating = false;
        this._requestQueue = [];
        if (!this._config.timeout) {
            this._config.timeout = DEFAULT_TIMEOUT;
        }
    }

    static setLogger(logger) {
        _logger = logger;
    }

    static addExpiresAt(token, requestDateTime = null) {
        const now = requestDateTime||new Date();
        now.setSeconds(now.getSeconds() + token.expires_in);
        if (!requestDateTime) {
            now.setSeconds(now.getSeconds() - SUBSTRACT_MILLIS);
        }
        const expires_at = now.toISOString();
        const expires_at_timestamp = now.getTime();
        return {...token, expires_at, expires_at_timestamp};
    }

    static createQueuedRequest(options, fitbit) {
        const promiseInspector = {
            reject: null,
            resolve: null
        };
        const queuedRequest = {
            promise: new Promise((resolve, reject) => {
                promiseInspector.reject = reject;
                promiseInspector.resolve = resolve;
            }),
            handler: () => {
                _LOG_DEBUG(`Processing queued request ${options.url}:`, options);
                fitbit.request(options).then(response => promiseInspector.resolve(response)).catch(error => promiseInspector.reject(error));
            }
        };

        return queuedRequest;
    }

    static hasTokenExpired(token) {
        if (!token.expires_at) {
            return true;
        }
        const now = new Date();
        if (token.expires_at_timestamp) {
            return (now.getTime() >= token.expires_at_timestamp);
        }
        const then = new Date(token.expires_at);
        console.log("then:", then);
        return (now.getTime() >= then.getTime());
    }

    static createData(data) {
        return qs.stringify(data);
    }

    authorizeURL() {
          const { AuthorizationCode } = require('simple-oauth2');
          const config = {
            client: {
              id: this._config.creds.clientID,
              secret: this._config.creds.clientSecret
            },
            auth: {
              tokenHost: this._config.uris.authorizationUri,
              tokenPath: this._config.uris.tokenPath,
              authorizePath: this._config.uris.authorizationPath
            }
          };
          const client = new AuthorizationCode(config);
          return client.authorizeURL(this._config.authorization_uri);
    }

    fetchToken(code = null) {
        _LOG_DEBUG("Token fetch started");
        const self = this;
        const url = self._config.uris.tokenUri + self._config.uris.tokenPath;
        const data = qs.stringify(code ? {
            code: code,
            redirect_uri: self._config.authorization_uri.redirect_uri,
            grant_type: 'authorization_code',
            client_id: self._config.creds.clientID,
            client_secret: self._config.creds.clientSecret,
        } : {
            'grant_type': 'refresh_token',
            'refresh_token': self._token.refresh_token
        });
        const config = {
            headers: {
                'Authorization': 'Basic ' + Buffer.from(self._config.creds.clientID + ':' + self._config.creds.clientSecret).toString('base64'),
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: self._config.timeout
        };
        const requestDateTime = new Date();
        _LOG_DEBUG(`Token fetch: ${url}`, {data, config});
        return axios.post(url, data, config).then(response => {
            const token = Fitbit.addExpiresAt(response.data, requestDateTime);
            self._token = token;
            _LOG_DEBUG("New token fetched:", token);
            return token;
        }).then(token => {
            return self._tokenManager.write(token);
        });
    }

    refresh() {
        _LOG_DEBUG("Token refresh started");
        return this.fetchToken(null);
    }

    request(options) {
        var self = this;

        if (self._isTokenRefreshingOrInitiating) {
            _LOG_DEBUG("Queueing request:", options);
            const queuedRequest = Fitbit.createQueuedRequest(options, self);
            self._requestQueue.push(queuedRequest.handler);
            return queuedRequest.promise;
        }

        _LOG_INFO("Request:", options);

        const performRequest = () => {
            if (!self._token.access_token) {
                return new Promise((resolve, reject) => {
                    const error = new Error('token appears corrupt: ' + JSON.stringify(self._token));
                    reject(error);
                });
            }

            if (!options.timeout) {
                options.timeout = self._config.timeout;
            }

            if (!options.url && options.uri) {
                options.url = options.uri;
                delete options.uri;
            }
            if (!options.headers) {
                options.headers = {};
            }

            if (!options.headers.Authorization) {
                options.headers.Authorization = 'Bearer ' + self._token.access_token;
            }
            _LOG_DEBUG("Perform request: ", options);
            return axios.request(options).then((response) => {
                _LOG_ERROR(`Request ${options.url}:`, (response.toString ? response.toString() : (response.data ? response.data : "...")));
                if (response.headers) {
                    self.limits = {
                        limit: response.headers['fitbit-rate-limit-limit'],
                        remaining: response.headers['fitbit-rate-limit-remaining'],
                        reset: response.headers['fitbit-rate-limit-reset'],
                    };
                }
                return response;
            });
        };

        const processQueuedRequests = () => {
            setTimeout(() => {
                const noqr = self._requestQueue.length;
                _LOG_DEBUG(`Processing ${noqr} queued requests`);
                while(self._requestQueue.length > 0) {
                    const qr = self._requestQueue.shift();
                    if (!qr) {
                        break;
                    }
                    qr();
                }
            }, 0);
        };

        if (!self._token) {
            self._isTokenRefreshingOrInitiating = true;
            return self._tokenManager.read().then(token => {
                _LOG_DEBUG("Loaded token: ", token);
                if (!token.expires_at_timestamp) {
                    token = Fitbit.addExpiresAt(token);
                    self._token = token;
                    _LOG_DEBUG("Loaded token (expire at added)", token);
                    return self._tokenManager.write(token);
                }
                self._token = token;
                return token;
            }).then(token => {
                if (Fitbit.hasTokenExpired(token)) {
                    _LOG_DEBUG("Token expired", token);
                    return self.refresh();
                }

                return token;
            }).then(() => {
                if (self._isTokenRefreshingOrInitiating) {
                    self._isTokenRefreshingOrInitiating = false;
                    processQueuedRequests();
                }
                return performRequest();
            });
        } else if (Fitbit.hasTokenExpired(self._token)) {
            this._isTokenRefreshingOrInitiating = true;
            _LOG_DEBUG("Existing token expired", self._token);
            return self.refresh().then(() => {
                if (self._isTokenRefreshingOrInitiating) {
                    self._isTokenRefreshingOrInitiating = false;
                    processQueuedRequests();
                }
                return performRequest();
            });
        }

        return performRequest();
    }

    getLimits() {
        return this.limits;
    }
}

module.exports = Fitbit;
