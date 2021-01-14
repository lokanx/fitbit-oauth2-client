const appConfig = require( './config/app.json' );
const Fitbit = require( '../Fitbit' ); 
const FileTokenManager = require( '../FileTokenManager' );

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
FileTokenManager.setLogger(LOGGER);

const request = (fitbit, options) => {
    LOGGER.debug("Making request:", options);

    // Make an API call
    return fitbit.request(options).then(response => {
        LOGGER.debug('Received response:', {response});
        return response;
    }).catch(error => {
        LOGGER.error(error);
        LOGGER.error(`Request ${options.url} failed: ` + error.messsage||'', {error});
        throw error;
    });  
};

const getProfile = (fitbit) => {
    return request(fitbit, {
        url: "https://api.fitbit.com/1/user/-/profile.json",
        method: 'GET',
    }).then(response => {
        LOGGER.debug("Received profile Data:", response.data);
        return response.data;
    }).catch(error => {
        LOGGER.error(error);
        throw error;
    });
};

describe('request', () => {
    let fitbit;
    let fileTokenManager;

    beforeEach(() => {
        const fitbitConfig = appConfig.fitbit;
        fileTokenManager = new FileTokenManager(fitbitConfig.tokenFilePath);
        fitbit = new Fitbit(fitbitConfig, fileTokenManager);    
    });

    test('getProfile - expired token', (done) => {        
        fileTokenManager.read().then(token => {
            if (token.expires_at) {
                delete token.expires_at;
            }
            fitbit._token = token;
            getProfile(fitbit).finally(() => {
                done();
            });                        
        });    
    });

    test('getProfile - no token', (done) => {        
        getProfile(fitbit).finally(() => {
            done();
        });        
    });

    test('getProfile - has token', (done) => {        
        fileTokenManager.read().then(token => {
            fitbit._token = token;
            getProfile(fitbit).finally(() => {
                done();
            });                        
        });    
    });
});