const fs = require( 'fs' );

const JSON_IDENT = 3;
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

class FileTokenManager {

    constructor(tokenFilePath) {
        this._tokenFilePath = tokenFilePath;
    }

    static setLogger(logger) {
        _logger = logger;
    }

    read() {
        return new Promise((resolve, reject) => {
            try {
                _LOG_DEBUG( 'Reading token file [' + this._tokenFilePath + ']');
                fs.readFile( this._tokenFilePath, { encoding: 'utf8', flag: 'r' }, function( err, data ) {
                    if ( err ) {
                        _LOG_ERROR("Read failed:", err);
                        return reject( err );
                    }
                    try {
                        const token = JSON.parse( data );
                        _LOG_DEBUG("Read token:", token);
                        resolve( token );
                    } catch( error ) {
                        _LOG_ERROR("Read failed<2>:", error);
                        reject( error );
                    }
                });
            } catch (error) {
                _LOG_ERROR("Read failed<2>:", error);
                reject(error);
            }
        });
    }

    write(token) {
        return new Promise((resolve, reject) => {
            try {
                _LOG_DEBUG( 'Writing token file [' + this._tokenFilePath + ']:', token );
                fs.writeFile( this._tokenFilePath, JSON.stringify( token ), { encoding: 'utf8', flag: 'w' }, (err) => {
                    if (err) {
                        _LOG_ERROR("Write failed:", err);
                        reject(err);
                    } else {
                        _LOG_DEBUG("Wrote token:", token);
                        resolve(token);
                    }
                });
            } catch (error) {
                _LOG_ERROR("Write failed<2>:", error);
                reject(error);
            }
        });
    }
}

module.exports = FileTokenManager;