var express = require('express');
var app = express();

// documented here: https://developer.apple.com/documentation/appstorereceipts/verifyreceipt
var urlSandbox = "https://sandbox.itunes.apple.com/verifyReceipt";
var urlProd = "https://buy.itunes.apple.com/verifyReceipt";

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({extended: true}));

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

// expecting the shared secret as a lambda env varaible
// OR if its not there, as the one and only cmd line argument, which *should*
// be in the 3rd position (after node, and script name)
var sharedSecret = process.env.sharedSecret;
if (sharedSecret == null || sharedSecret == "") {
  sharedSecret = process.argv[2];
}

console.log("Shared secret: " + [sharedSecret].map(
        s => s.slice(0, 4) + s.slice(4).replace(/\S/g, '*')
    ))

// we need to try twice, first to prod, then to sandbox
// this method does the raw sending
function sendToApple(url, receiptData, responseToClient, onCompletion) {
  var request = require('request');
  request.post({ headers: {'content-type' : 'application/json'},
    url: url,
    json: {
      'password': sharedSecret,
      //'exclude-old-transactions': 'true', Sandbox doesn't seem to work with this! always got a non-latest bit
      'receipt-data': receiptData
    }
  }, function(error, response, body) {
    console.log("Error: ", error);
    console.log("Status: ", response && response.statusCode);
    //console.log("Body: " + JSON.stringify(body));

    // if we didn't get ok, then write it back
    if(!response || response.statusCode != 200) {
      console.log("got bad result, not trying again: ", response)
      responseToClient.sendStatus(400)
    }

    onCompletion(body, responseToClient)
  });
}

// actually send the response to the client
function processResponseFromApple(appleBody, responseToClient) {
  responseToClient.json(appleBody);
}

// Access the parse results as request.body
app.post('/verifyReceipt', function(request, response){

    // parse out the receipt-data
    var receiptData = request.body["receipt-data"]
    if(receiptData == null) {
      console.log("Didn't see receipt-data in message, bad request.");
      response.sendStatus(400)
      return
    }

    // always try to prod first
    sendToApple(urlProd, receiptData, response, function(appleBody, responseToClient) {

        // if the response is a status of 21007, then resend to sandbox
        if(appleBody["status"] == 21007) {
          console.log("Sending to sandbox...")
          sendToApple(urlSandbox, receiptData, response, processResponseFromApple)
        } else {
          // can process this now
          console.log("Response from prod is good...")
          processResponseFromApple(appleBody, responseToClient)
        }
    })
});

// for local
//app.listen(3000);

// for lambda
//module.exports = app

// for serverless
var serverless = require('serverless-http');
module.exports.handler = serverless(app);

console.log("Listening...")
