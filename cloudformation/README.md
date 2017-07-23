AWS Cloudformation templates for LambdaUniverse consists of two distinct sets of resource generating templates:

* `per_region_lambda_universe_log_groups_and_metrics` which should be run FOR EVERY REGION
* `us-east-1_lambda_universe_functions` which MUST BE DEPLOYED TO US-EAST-1, this is a technical Lambda@Edge limitation.

Also, the later will initiate a global CloudWatch dashboard called 'LambdaUniverse', which displays metrics for all currently available AWS regions. An individual widget is needed for this. Thats an unfortunate CloudWatch limitation.

## example:
```
for region in us-east-1 us-east-2 us-west-1 us-west-2 ap-south-1 ap-northeast-2 ap-southeast-1 ap-southeast-2 ap-northeast-1 ca-central-1 eu-central-1 eu-west-1 eu-west-2 sa-east-1; do \
aws --region ${region} cloudformation update-stack --stack-name LambdaUniverseLogGroups --template-body file://cloudformation/per_region_lambda_universe_log_groups_and_metrics.yaml; \
done
```

```
aws --region us-east-1 cloudformation update-stack --capabilities CAPABILITY_IAM --stack-name LambdaUniverseFunctions --template-body file://cloudformation/us-east-1_lambda_universe_functions.yaml
```
