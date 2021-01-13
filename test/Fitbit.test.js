const fs     = require( 'fs' );
const appConfig = require( './config/app.json' );
const Fitbit = require( '../Fitbit' ); 
const FilePersistTokenManager = require( '../FilePersistTokenManager' );


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

Fitbit.setLogger(LOGGER);
FilePersistTokenManager.setLogger(LOGGER);

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

const persist = new FilePersistTokenManager(appConfig.fitbit);


const request = (fitbit, options, callback) => {
    const self = this;

    LOGGER.debug("Making request:", options);

    // Make an API call
    fitbit.request(options, function( err, body, token ) {
        if ( err ) {
            LOGGER.error("Error:", JSON.stringify({err: formatError(err), body, token} ));
            throw err;
        }
        
        LOGGER.debug('Received data:', {err, body, token});

        // If the token arg is not null, then a refresh has occured and
        // we must persist the new token.
        if ( token ) {
            LOGGER.debug("Got new token:", token);
            persist.write( parseResponse(token), function( err ) {
                if ( err ) {
                    LOGGER.error("Error:", JSON.stringify({err: formatError(err)}));                    
                    throw err;
                } else {
                    callback(parseResponse( body ));        
                }                
            });
        } else {
            callback(parseResponse( body ));
        }
    });        
};

const getProfile = (fitbit, callback) => {
    request(fitbit, {
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
    persist.read( function( err, token ) {
        if ( err ) {
            LOGGER.error( err );
            throw err;
        }

        // Set the client's token
        fitbit.setToken( token );

        if (!token.expires_at) {
            token = Fitbit.addExpiresAt(token);
            persist.write( token, function( err ) {
                if ( err ) {
                    LOGGER.error( err );
                    throw err;
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
        console.log('ACTIVE TOKEN:', fitbit.getToken());
        const token = fitbit.getToken();
        if (token.expires_at) {
            delete token.expires_at;
        }
        getProfile(fitbit, () => {
            done();
        });        
    });
});