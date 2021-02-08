# Fitbit OAuth2 Client

Client library to support interfacing with the Fitbit API using OAuth2.

This library implements the Authorization Code Grant Flow for Fitbit.  Specifically, this flow
allows a browser-less server to make Fitbit API calls using a persisted token.  The initial
user authorization must be done in a browser environment.  If the token returned is persisted
(to a database for example), then subsequent API calls may be made on behalf of the user by
webserver or by non-webserver code.  This library automatically handles token refreshes.

This is a complete rewrite of code from https://github.com/peebles/fitbit-oauth2 (and https://github.com/Info-World/fitbit-oauth2).
The reason for the rewrite was that the code was old and utilized libraries that contained security problems.

## Installation
_npm install fitbit-oauth2-client_
## Usage Example

### In a webapp

    const express = require('express');
    const RateLimit = require('express-rate-limit');
    const appConfig = require( './config/appConfig' );
    const {Fitbit, FileTokenManager} = require( 'fitbit-oauth2-client' );

    const JSON_INDENT = 3;
    const EXPRESS_HTTP_PORT = 4000;

    const ONE_MINUTE = 60000;

    // Create instance
    const app = express();

    // Set up rate limiter: maximum of five requests per minute
    var limiter = new RateLimit({
    windowMs: ONE_MINUTE, // 1 minute
    max: 5
    });

    // apply rate limiter to all requests
    app.use(limiter);

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

### Outside of a webapp

Once a token has been persisted, you can write non-webapp code to call Fitbit APIs.  When
the token expires, this library will automatically refresh the token and carry on.  Here's
an example:

    const appConfig = require( './config/appConfig' );
    const {Fitbit, FileTokenManager} = require( 'fitbit-oauth2-client' );

    const JSON_INDENT = 3;
    const EXPRESS_HTTP_PORT = 4000;

    // Instanciate a fitbit client.  See example config below.
    //
    var fitbit = new Fitbit( appConfig.fitbit, new FileTokenManager(appConfig.fitbit.tokenFilePath) );

    // Make an API call
    fitbit.request({
        uri: "https://api.fitbit.com/1/user/-/profile.json",
        method: 'GET',
    }).then(response => {
        console.log("Profile:", JSON.stringify( response.data, null, JSON_INDENT ));
        process.exit(0);
    }).catch(err => {
        process.exit(-1);
    });
## Configuration

An example configuration file:

    {
        "fitbit": {
            "timeout": 10000,
            "creds": {
                "clientID": "YOUR-CIENT-ID",
                "clientSecret": "YOUR-CLIENT-SECRET"
            },
            "tokenFilePath": "./path/to/my-token-file.json",
            "uris": {
                "authorizationUri": "https://www.fitbit.com",
                "authorizationPath": "/oauth2/authorize",
                "tokenUri": "https://api.fitbit.com",
                "tokenPath": "/oauth2/token"
            },
            "authorization_uri": {
                "redirect_uri": "http://localhost:4000/fitbit_auth_callback/",
                "response_type": "code",
                "scope": "activity nutrition profile settings sleep social weight heartrate",
                "state": "3(#0/!~"
            }
        }
    }

## Token Storage

A token is a JSON blob, and looks like this:

    {
        "access_token": ACCESS_TOKEN,
        "expires_in": SECONDS,
        "expires_at": "20150829T10:20:25",
        "refresh_token": REFRESH_TOKEN
    }

## API

#### `new Fitbit( config )`
FileTokenManager is used to persist tokens, config needs to define property tokenFilePath which needs to define a valid file path.
#### `new Fitbit( config, persistManager )`
Constructor.  See example config above. Persist manager must define methods read, write. Both methods should return a promise, see FileTokenManager.js for an example.

    {
        read() {
            return new Promise((resolve, reject) => {
                // Do you magic here, for example read from an database
            });
        }

        write(token) {
            return new Promise((resolve, reject) => {
                // Do you magic here, for example write to an database
            });
        }
    }

The library provides a token manager that reads/writes to file (FileTokenManager).

#### `authorizeURL(): String`
Used in a webapp to get the authorization URL to start the OAuth2 handshake.  Typical usage:

    app.get( '/auth', function( req, res ) {
        res.redirect( fitbit.authorizeURL() );
    });

#### `fetchToken( code ): Promise`
Used in a webapp to handle the second step of OAuth2 handshake, to obtain the token from Fitbit.  See
example above for usage.

#### `request( options ): Promise`
Call a Fitbit API.  The options structure is the same as axios library and in fact is passed
almost strait through to axios.  The cb() is called with (err, body, token).  If token is not
null, then it means that a token refresh has happened and you should persist the new token.

#### `getLimits()`
After a call to request(), you can make this call to get the Fitbit API limits returned in the
response headers.  This will look something like:

    {
        "limit": "150",
        "remaining": "146",
        "reset": "932"
    }

## Running tests

Short description on how to run the tests, follow the OAuth 2.0 tutorial page on fitbit test app page using flow type *Authorization Code Flow* on https://dev.fitbit.com/.

1. Create a test app and get client id, client secret, token and refresh token.
2. Copy token-test.json.sample into token-test.json and fill in the information.
3. Copy .env.sample into .env and fill in the information.
4. Run tests using npm test

## Roadmap

Things that will come....

* Support for Fitbit subscription API
* A Thin extendable wrapper for performing common REST API calls. Will make things easier to use since you will not need to read Fitbit documentation.