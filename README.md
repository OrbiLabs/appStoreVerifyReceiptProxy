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

Once its deployed to your AWS account, update your iOS code to point at this URL for app verification, and you're off to the races.

I'm probably missing something. Feel free to reach out if you need a hand! 
