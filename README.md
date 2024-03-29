# appStoreVerifyReceiptProxy

A simple serverless node.js app to accept receipt blobs from an iOS app, forward to apple for verification, and return the decoded result.

This is as simple as a web service we could muster to do the needful based on the documentation Apple suggests to do to verify receipts.

https://developer.apple.com/documentation/appstorereceipts/verifyreceipt

It is based on the serverless framework, and was based on this example: https://aws.amazon.com/blogs/compute/going-serverless-migrating-an-express-application-to-amazon-api-gateway-and-aws-lambda/

Theoretically, all you should need to do is;

1. make sure you have AWS CLI setup with write permissions in AWS API Gateway and Lambda: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-mac.html
2. make sure you have serverless cli all setup: https://www.serverless.com/framework/docs/providers/aws/guide/installation/
3. clone this repo
4. `npm install`
5. create a file in the root called 'localVars.yml' and a single line as follows, with the shared secret you got from apple in App Store Connect in it in the following format:

`sharedSecret: <the shared secret>`

5. Then to deploy live, run

`sls deploy`

To run locally, do the following

`node app.js <shared secret more on this below>`

## More on Shared Secret

The app needs to be configured with your App-Specific Shared Secret - this is the key to why verifying receipts needs to happen off-device. You can find your app store shared secret in App Store connect using this method: https://docs.revenuecat.com/docs/itunesconnect-app-specific-shared-secret

If you read the code in app.js, you'll see the shared secret is loaded from a lambda environment variable named **sharedSecret**. To see this in the AWS console, go into AWS, Lambda, pcrv1-pod-app (or whatever the function is named), Environment Variables, Edit, and you can see the value that is populated (and should conform to what you put in localVars.yml)

## After you deploy

Once its deployed to your AWS account, update your iOS code to point the receipt payload at URL of the form:

https://.....<it will tell you after you deploy>/prod/verifyReceipt

... for verification, and you're off to the races.

Here is some swift code that does that:

```
	func sendReceiptToApple(_ receiptAsBase64: String) -> Promise<String> {
		return Promise { seal in

			// we've got the receipt data, send it off to apple to verify
			let url = URL(string: verifyReceiptUrl)!
			var request = URLRequest(url: url)
			request.httpMethod = "POST"
			let jsonString = "{ \"receipt-data\" : \"\(receiptAsBase64)\" }"
			request.addValue("application/json", forHTTPHeaderField: "Content-Type")
			request.httpBody = jsonString.data(using: String.Encoding.utf8)
			let task = URLSession.shared.dataTask(with: request) { (data, response, error) in
				if let error = error {
					log.warn("error connecting to receipt verification: \(error)")
					seal.reject(error)
					return
				} else {
					if let response = response as? HTTPURLResponse {
						log.debug("statusCode: \(response.statusCode)")

						// don't continue unless status code is 200 - anything else shouldn't be parsed
						if response.statusCode != 200 {
							log.warn("bad status code, not trying to parse: \(response.statusCode)")
						} else if let data = data, let dataString = String(data: data, encoding: .utf8) {
							log.debug("data: \(dataString)")
							seal.fulfill(dataString)
							return
						}
					}
				}

				// should only get here in an error case
				seal.reject(AppReceiptError.unexpectedResponseFromApple)
			}
			task.resume()
		}
	}
```

I'm probably missing something, i'm far from an expert in these technologies. Feel free to reach out if you need a hand!
