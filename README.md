# appStoreVerifyReceiptProxy
Simple node app to accept requests from an app, forward to apple for verification, and return the decoded result.

This is as simple as a web service we could muster to do the needful based on the documentation Apple suggests to do to verify receipts.

https://developer.apple.com/documentation/appstorereceipts/verifyreceipt

Its based on the serverless framework.

Theoretically, all you should need to do is;
1. sure you have AWS CLI setup with write permissions in AWS API Gateway and Lambda
2. clone this repo
3. npm install
4. sls deploy

Once its deployed to your AWS account, update your iOS code to point the receipt payload at URL of the form:

https://.....<it will tell you after you deploy>/prod/verifyReceipt
  
... for verification, and you're off to the races.

Here is some swift code that does that:

`	func sendReceiptToApple(_ receiptAsBase64: String) -> Promise<String> {
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
  `

I'm probably missing something. Feel free to reach out if you need a hand! 
