const fs = require( 'fs' );
const LogManager = require('./LogManager');

let _logger = LogManager.getLogger();

class FileTokenManager {

    constructor(tokenFilePath) {
        this._tokenFilePath = tokenFilePath;
    }

    static setLogger(logger) {
        _logger = LogManager.getLogger(logger);
    }

    read() {
        return new Promise((resolve, reject) => {
            try {
                _logger.debug( 'Reading token file [' + this._tokenFilePath + ']');
                fs.readFile( this._tokenFilePath, { encoding: 'utf8', flag: 'r' }, function( err, data ) {
                    if ( err ) {
                        _logger.error('Read failed:', err);
                        return reject( err );
                    }
                    try {
                        const token = JSON.parse( data );
                        _logger.trace('Read token:', token);
                        resolve( token );
                    } catch( error ) {
                        _logger.error('Read failed<2>:', error);
                        reject( error );
                    }
                });
            } catch (error) {
                _logger.error('Read failed<2>:', error);
                reject(error);
            }
        });
    }

    write(token) {
        return new Promise((resolve, reject) => {
            try {
                _logger.debug( 'Writing token file [' + this._tokenFilePath + ']:', token );
                fs.writeFile( this._tokenFilePath, JSON.stringify( token ), { encoding: 'utf8', flag: 'w' }, (err) => {
                    if (err) {
                        _logger.error('Write failed:', err);
                        reject(err);
                    } else {
                        _logger.trace('Wrote token:', token);
                        resolve(token);
                    }
                });
            } catch (error) {
                _logger.error('Write failed<2>:', error);
                reject(error);
            }
        });
    }
}

module.exports = FileTokenManager;