const dotenv = require('dotenv');
dotenv.config(); 

module.exports = {
    "fitbit": {
        "timeout": 10000,
        "creds": {
            "clientID": process.env.env_clientID,
            "clientSecret": process.env.env_clientSecret
        },
        "tokenFilePath": "./test/config/token-test.json",
        "uris": {
            "authorizationUri": "https://www.fitbit.com",
            "authorizationPath": "/oauth2/authorize",
            "tokenUri": "https://api.fitbit.com",
            "tokenPath": "/oauth2/token"
        },
        "authorization_uri": {
            "redirect_uri": process.env.env_redirect_uri,
            "response_type": "code",
            "scope": "location activity nutrition social settings profile sleep heartrate weight",
            "state": "3(#0/!~"
        }
    }
};