# ArangoDB cluster starter for AWS

This app is designed to deploy a cluster of ArangoDB instances to an AWS account. To use this CDK app, you must:

1. Create an .env file from .env.example and populate the variables.
2. Run `npm run build` to build the TypeScript to JS
3. Run `cdk deploy` to deploy the app using your default AWS credentials.
4. After the CDK deployment completes, your cluster will be ready. This template does not provision any load balancing so it will be up to you to provision public access to the cluster.

## .env parameter reference

JWT_SECRET - The [JWT secret](https://www.arangodb.com/docs/stable/programs-starter-options.html) used to set up authentication.  

ARANGODB_VERSION - The ArangoDB version that you want to deploy. This application only supports provisioning ArangoDB 3.4+ clusters.

ENVIRONMENT_NAME - The name of the environment you want to deploy. i.e. Production

INSTANCE_TYPE - The [AWS instance type](https://aws.amazon.com/ec2/instance-types/) you want to provision the cluster with.

VOLUME_SIZE - The volume size in GB to use for the EC2 instances.

VOLUME_TYPE - The volume type to use for the EC2 instances i.e. `gp2`

VOLUME_IOPS - The number of IOPS to provision if using the io1 volume type.

SUBNETS - A comma-delimited string of three subnets to deploy the cluster to.

AVAILABILITY_ZONES - A comma-delimited string of three availability zones to deploy the cluster to. They must match and be in the same order as the subnets in the previous setting.

SECURITY_GROUPS - A comma-delimited string of security group IDs to assign to the EC2 instances.

CDK_DEFAULT_ACCOUNT - The account number of the AWS account to deploy to.

CDK_DEFAULT_REGION - The region you want to deploy to.

INSTANCE_ROLE_NAME - (Optional) The name of an instance role to assign to the EC2 instances

USE_SPOT_INSTANCES - (Optional) Set to 'true' if you want to use Spot instances.

KEY_NAME - (Optional) An EC2 SSH keypair name to assign to the EC2 instances.


## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
