const fs = require( 'fs' );

const JSON_IDENT = 3;
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

class FileTokenManager {

    constructor(tokenFilePath) {
        this._tokenFilePath = tokenFilePath;
    }

    static setLogger(logger) {
        _logger = logger;
    }

    read() {

        return new Promise((resolve, reject) => {
            _LOG( 'Reading token file [' + this._tokenFilePath + ']');
            fs.readFile( this._tokenFilePath, { encoding: 'utf8', flag: 'r' }, function( err, data ) {
                if ( err ) {
                    return reject( err );
                }
                try {
                    const token = JSON.parse( data );
                    resolve( token );
                } catch( error ) {
                    reject( error );
                }
            });
        });
    }

    write(token) {
        return new Promise((resolve, reject) => {
            _LOG( 'Writing token file [' + this._tokenFilePath + ']:', token );
            fs.writeFile( this._tokenFilePath, JSON.stringify( token ), { encoding: 'utf8', flag: 'w' }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(token);
                }
            });
        });
    }
}

module.exports = FileTokenManager;