const fs = require( 'fs' );

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

class FilePersistTokenManager {

    constructor(config) {
        this.filePath = config.tokenFilePath;
    }

    static setLogger(logger) {
        _logger = logger;
    }

    read(cb = null) {

        const promise = new Promise((resolve, reject) => {
            _LOG( 'Reading token file [' + this.filePath + ']');
            fs.readFile( this.filePath, { encoding: 'utf8', flag: 'r' }, function( err, data ) {
                if ( err ) {
                    return reject( err );
                }
                try {
                    const token = JSON.parse( data );
                    resolve( token );
                } catch( err ) {
                    reject( err );
                }
            });
        });

        if (!cb) {
            return promise;
        }

        promise.then((token) => {
            cb(null, token);
        }).catch(error => {
            cb(error);
        });        
    }

    write( token, cb = null ) {
        const promise = new Promise((resolve, reject) => {
            _LOG( 'Writing token file [' + this.filePath + ']:', token );
            fs.writeFile( this.filePath, JSON.stringify( token ), (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        if (!cb) {
            return promise;
        }

        promise.then((token) => {
            cb(null, token);
        }).catch(error => {
            cb(error);
        });       
    }
}

module.exports = FilePersistTokenManager