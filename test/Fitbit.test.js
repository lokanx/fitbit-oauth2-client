const fs     = require( 'fs' );
const moment = require('moment');
const appConfig = require( './config/app.json' );
const Fitbit = require( '../Fitbit' ); 


const LOGGER = {
    debug: (...argv) => {
        console.log(argv);
    },
    info: (...argv) => {
        console.log(argv);
    },
    warn: (...argv) => {
        console.log(argv);
    },
    error: (...argv) => {
        console.log(argv);
    }
};

const formatError = (err) => {
    return err;
};

const parseResponse = (resp) => {
    try {
        if (typeof(resp) === "string") {
            return JSON.parse( resp );
        }
        
        return resp;
    } catch (err) {
        LOGGER.error("Failed parse response of type " + typeof(resp) + ": " + JSON.stringify(resp), err);
    }
};

const persist = {
    read: function( filename, cb ) {
        LOGGER.debug( 'Reading token file [' + filename + ']');
        fs.readFile( filename, { encoding: 'utf8', flag: 'r' }, function( err, data ) {
            if ( err ) return cb( err );
            try {
                var token = JSON.parse( data );
                cb( null, token );
            } catch( err ) {
                cb( err );
            }
        });
    },
    write: function( filename, token, cb ) {
        LOGGER.debug( 'persisting new token file [' + filename + ']:', JSON.stringify( token ) );
        fs.writeFile( filename, JSON.stringify( token ), cb );
    }
};

const request = (fitbit, fitbitConfig, options, callback) => {
    const self = this;

    LOGGER.debug("Making request:", options);

    // Make an API call
    fitbit.request(options, function( err, body, token ) {
        if ( err ) {
            LOGGER.error("Error:", {err: formatError(err), body, token} );
            process.exit(1);
        }
        
        LOGGER.debug('Received data:', {err, body, token});

        // If the token arg is not null, then a refresh has occured and
        // we must persist the new token.
        if ( token ) {
            LOGGER.debug("Got new token:", token);
            persist.write( fitbitConfig.tokenFilePath, parseResponse(token), function( err ) {
                if ( err ) {
                    LOGGER.error("Error:", {err: formatError(err)} );                    
                    process.exit(-1);
                } else {
                    callback(parseResponse( body ));        
                }                
            });
        } else {
            callback(parseResponse( body ));
        }
    });        
};

const getProfile = (fitbit, fitbitConfig, callback) => {
    request(fitbit, fitbitConfig, {
        uri: "https://api.fitbit.com/1/user/-/profile.json",
        method: 'GET',
    }, (data) => {
        LOGGER.debug("Profile Data:", data);
        callback(data);
    });
};

const init = (fitbitConfig, callback) => {
    const fitbit = new Fitbit(fitbitConfig);

    // Read the persisted token, initially captured by a webapp.
    //     
    persist.read( fitbitConfig.tokenFilePath, function( err, token ) {
        if ( err ) {
            LOGGER.error( err );
            process.exit(1);
        }

        // Set the client's token
        fitbit.setToken( token );

        if (!token.expires_at) {
            token.expires_at = moment().add( token.expires_in, 'seconds' ).format( 'YYYYMMDDTHH:mm:ss' );
            persist.write( fitbitConfig.tokenFilePath, token, function( err ) {
                if ( err ) {
                    LOGGER.error( err );
                    process.exit(-1);
                } else {
                    callback();        
                }                
            });
        } else {
            callback();
        }

    });

    return fitbit;
}

describe('request', () => {
    let fitbit;
    beforeEach((done) => {
        fitbit = init(appConfig.fitbit, () => {
            done();
        });
    });

    test('getProfile', (done) => {
        console.log('TOKEN:', fitbit.getToken());
        getProfile(fitbit, appConfig.fitbit, () => {
            done();
        });        
    });
});