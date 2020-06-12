#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ArangoDbClusterStack } from '../lib/arango_db_cluster-stack';
require('dotenv').config();

const app = new cdk.App();
new ArangoDbClusterStack(app, 'ArangoDbClusterStack', { 
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
}});
