var express = require('express');
var app = express();

// documented here: https://developer.apple.com/documentation/appstorereceipts/verifyreceipt
var urlSandbox = "https://sandbox.itunes.apple.com/verifyReceipt";
var urlProd = "https://buy.itunes.apple.com/verifyReceipt";

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({extended: true}));

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

// expecting the shared secret as the one and only argument, which *should*
// be in the 3rd position (after node, and script name)
var sharedSecret = process.argv[2];



// we need to try twice, first to prod, then to sandbox
// this method does the raw sending
function sendToApple(url, receiptData, responseToClient, onCompletion) {
  var request = require('request');
  request.post({ headers: {'content-type' : 'application/json'},
    url: url,
    json: {
      'password': sharedSecret,
      'exclude-old-transactions': 'true',
      'receipt-data': receiptData
    }
  }, function(error, response, body) {
    console.log("Error: ", error);
    console.log("Status: ", response && response.statusCode);
    //console.log("Body: " + JSON.stringify(body));

    // if we didn't get ok, then write it back
    if(!response || response.statusCode != 200) {
      console.out("got bad result, not trying again: ", response)
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
      response.sendStatus(400)
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
          processResponseFromApple(applyBody, responseToClient)
        }
    })
});

app.listen(3000);

console.log("Listening...")
