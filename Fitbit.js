const axios = require('axios');
const qs = require('qs');

const JSON_IDENT = 3;
const DEFAULT_TIMEOUT = 60000; // 1 minute
const HTTP_STATUS_400 = 400;

let _logger = null;

const _LOG = (msg, data) => {
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
class Fitbit {
    constructor(config, tokenManager) {
        if (!config) {
            throw new Error('Config expected');
        }
        if (!tokenManager ) {
            throw new Error('Token persist managaer expected');
        }
        if (!tokenManager.read || !tokenManager.write) {
            throw new Error('Token perist manager must define methods read and write');
        }

        this._config = {...config};
        this._tokenManager = tokenManager;        
        this._token = null;
        if (!this._config.timeout) {
            this._config.timeout = DEFAULT_TIMEOUT;
        }
    }

    static setLogger(logger) {
        _logger = logger;
    }

    static addExpiresAt(token) {
        const now = new Date();
        now.setSeconds(now.getSeconds() + token.expires_in);
        const expires_at = now.toISOString();        
        return {...token, expires_at};
    }

    static hasTokenExpired(token) {
        if (!token.expires_at) {
            return true;
        }

        const then = new Date(token.expires_at);
        const now = new Date();
        return (now.getTime() >= then.getTime());
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
        return axios.post(url, data, config).then(response => {
            if (response.status >= HTTP_STATUS_400) {
                _LOG('Status Error:', response);
                const error = new Error((code ? 'Unknown fitbit fetch token request error.' : 'Unknown fitbit refresh request error.'));
                error.response = response;
                error.config = config;
                error.data = data;
                error.url = url;
                throw error;
            }
            const token = Fitbit.addExpiresAt(response.data);
            self._token = token;
            return token;
        }).then(token => {
            return self._tokenManager.write(token);
        });
    }

    getToken() {
        return this._token;
    }

    refresh() {
        return this.fetchToken(null);
    }

    request(options) {
        var self = this;

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

            return axios.request(options).then((response) => {
                self.limits = {
                    limit: response.headers['fitbit-rate-limit-limit'],
                    remaining: response.headers['fitbit-rate-limit-remaining'],
                    reset: response.headers['fitbit-rate-limit-reset'],
                };
                if (response.status >= HTTP_STATUS_400) {
                    _LOG('Status Error:', response);
                    const error = new Error('Unknown fitbit fetch request error.');
                    error.response = response;
                    error.options = options;
                    throw error;
                }
                return response;               
            });
        };

        if (!self._token) {
            return self._tokenManager.read().then(token => {
                if (!token.expires_at) {
                    token = Fitbit.addExpiresAt(token);
                    self._token = token;
                    return self._tokenManager.write(token);
                }
                self._token = token;
                return token;
            }).then(token => {
                if (Fitbit.hasTokenExpired(token)) {
                    return self.refresh();
                }

                return token;
            }).then(() => {
                return performRequest();
            });
        } else if (Fitbit.hasTokenExpired(self._token)) {
            return self.refresh().then(() => {
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
