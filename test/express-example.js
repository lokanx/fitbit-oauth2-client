const express = require('express');
const app = express();
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

const JSON_INDENT = 3;
const EXPRESS_HTTP_PORT = 4000;

Fitbit.setLogger(LOGGER);
FileTokenManager.setLogger(LOGGER);

// Instanciate a fitbit client.  See example config below.
//
var fitbit = new Fitbit( appConfig.fitbit, new FileTokenManager(appConfig.fitbit.tokenFilePath) ); 


// In a browser, http://localhost:4000/fitbit to authorize a user for the first time.
//
app.get('/fitbit', function (req, res) {
    res.redirect( fitbit.authorizeURL() );
});

// Callback service parsing the authorization token and asking for the access token.  This
// endpoint is refered to in config.fitbit.authorization_uri.redirect_uri.  See example
// config below.
//
app.get('/fitbit_auth_callback', function (req, res, next) {
    var code = req.query.code;
    fitbit.fetchToken(code).then(token => {
        LOGGER.debug("Token fetched and persisted: ", token);
        res.redirect( '/fb-profile' );
    }).catch(err => {
        next( err );
    });    
});

// Call an API.  fitbit.request() mimics nodejs request() library, automatically
// adding the required oauth2 headers.  The callback is a bit different, called
// with ( err, body, token ).  If token is non-null, this means a refresh has happened
// and you should persist the new token.
//
app.get( '/fb-profile', function( req, res, next ) {
    fitbit.request({
        uri: "https://api.fitbit.com/1/user/-/profile.json",
        method: 'GET',
    }).then(response => {
        res.send( '<pre>' + JSON.stringify( response.data, null, JSON_INDENT ) + '</pre>' );
    }).catch(err => {
        next( err );
    });
});

app.listen(EXPRESS_HTTP_PORT);