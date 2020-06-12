import * as cdk from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as ssm from '@aws-cdk/aws-ssm'
const Base64 = require('js-base64').Base64
require('dotenv').config()

const btoa = function (str: string) {
  return Base64.encode(str)
}

export class ArangoDbClusterStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)
    const arangoVersion = process.env.ARANGODB_VERSION as string
    const semver = arangoVersion.split('.')
    if (semver[0] === '3' && parseInt(semver[1]) >= 4) {
      const jwtSecret = process.env.JWT_SECRET as string
      const installArangoString = `cd /etc/yum.repos.d && curl -OL https://download.arangodb.com/arangodb${semver[0]}${semver[1]}/RPM/arangodb.repo && yum -y install arangodb3-${arangoVersion}`
      const ec2Ami = ssm.StringParameter.valueForStringParameter(this, '/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2')
      const environmentName = process.env.ENVIRONMENT_NAME as string
      const useSpot = (process.env.USE_SPOT_INSTANCES as string === 'true')
      const instanceType = process.env.INSTANCE_TYPE as string
      const volumeType = process.env.VOLUME_TYPE as string
      const volumeIops = process.env.VOLUME_IOPS as string
      const instanceRoleName = process.env.INSTANCE_ROLE_NAME as string
      const volumeSize = parseInt(process.env.VOLUME_SIZE as string)
      const keyName = process.env.KEY_NAME as string
      const subnets = process.env.SUBNETS as string
      const subnetsSplit = subnets.split(',')
      const securityGroups = process.env.SECURITY_GROUPS as string
      const availabilityZones = process.env.AVAILABILITY_ZONES as string
      const zonesSplit = availabilityZones.split(',')
      const subnet1 = ec2.Subnet.fromSubnetAttributes(this, 'Subnet1', {
        subnetId: subnetsSplit[0],
        availabilityZone: zonesSplit[0]
      })
      const subnet2 = ec2.Subnet.fromSubnetAttributes(this, 'Subnet2', {
        subnetId: subnetsSplit[1],
        availabilityZone: zonesSplit[1]
      })
      const subnet3 = ec2.Subnet.fromSubnetAttributes(this, 'Subnet3', {
        subnetId: subnetsSplit[2],
        availabilityZone: zonesSplit[2]
      })
      const Template1 = new ec2.CfnLaunchTemplate(this, 'Template1', {
        launchTemplateData: {
          ebsOptimized: true,
          iamInstanceProfile: (instanceRoleName) ? {
            name: instanceRoleName
          } : undefined,
          blockDeviceMappings: [
            {
              deviceName: '/dev/xvda',
              ebs: {
                encrypted: true,
                deleteOnTermination: true,
                volumeSize: volumeSize,
                volumeType: volumeType,
                iops: (volumeType === 'io1') ? parseInt(volumeIops) : undefined
              }
            }
          ],
          keyName: (keyName) ? keyName : undefined,
          imageId: ec2Ami,
          instanceType: instanceType,
          monitoring: {
            enabled: true
          },
          userData: btoa(`
          #cloud-config
          repo_update: true
          repo_upgrade: all
          users:
          - default
          - name: arangouser
          write_files:
          - content: ${jwtSecret}
            path: /home/arangouser/arangoSecret
          - content: |
              #!/bin/bash
              /usr/bin/arangodb --starter.address=$(echo $(hostname -I) | cut -d' ' -f1) --auth.jwt-secret=/home/arangouser/arangoSecret
            path: /usr/bin/start-arango.sh
          - content: |
              [Unit]
              Description=Run the ArangoDB Starter
              After=network.target
              [Service]
              Restart=on-failure
              ExecStart=/bin/bash /usr/bin/start-arango.sh
              TimeoutStopSec=60
              LimitNOFILE=1048576
              [Install]
              WantedBy=multi-user.target
            path: /etc/systemd/system/arango-cluster.service
          packages:
          - amazon-ssm-agent
          runcmd:
          - ${installArangoString}
          - systemctl enable amazon-ssm-agent;
          - systemctl start amazon-ssm-agent;
          - systemctl enable arango-cluster;
          - systemctl start arango-cluster;
          `),
          tagSpecifications: [
            {
              resourceType: 'instance',
              tags: [
                {
                  key: 'update',
                  value: 'true'
                },
                {
                  key: 'Name',
                  value: `${environmentName} - ArangoDB Instance 1`
                }
              ]
            }
          ],
          instanceMarketOptions: (useSpot) ? {
            marketType: 'spot',
            spotOptions: {
              instanceInterruptionBehavior: 'stop',
              spotInstanceType: 'persistent'
            }
          } : undefined
        }
      })
      const instance1 = new ec2.CfnInstance(this, 'Instance1', {
        subnetId: subnet1.subnetId,
        securityGroupIds: securityGroups.split(','),
        launchTemplate: {
          launchTemplateId: Template1.ref,
          version: Template1.attrLatestVersionNumber
        },
        availabilityZone: subnet1.availabilityZone
      })
      const Template2 = new ec2.CfnLaunchTemplate(this, 'Template2', {
        launchTemplateData: {
          ebsOptimized: true,
          iamInstanceProfile: (instanceRoleName) ? {
            name: instanceRoleName
          } : undefined,
          blockDeviceMappings: [
            {
              deviceName: '/dev/xvda',
              ebs: {
                encrypted: true,
                deleteOnTermination: true,
                volumeSize: volumeSize,
                volumeType: volumeType,
                iops: (volumeType === 'io1') ? parseInt(volumeIops) : undefined
              }
            }
          ],
          keyName: (keyName) ? keyName : undefined,
          imageId: ec2Ami,
          instanceType: instanceType,
          monitoring: {
            enabled: true
          },
          userData: cdk.Fn.base64(cdk.Fn.sub(`
          #cloud-config
          repo_update: true
          repo_upgrade: all
          users:
          - default
          - name: arangouser
          write_files:
          - content: ${jwtSecret}
            path: /home/arangouser/arangoSecret
          - content: |
              #!/bin/bash
              /usr/bin/arangodb --starter.address=$(echo $(hostname -I) | cut -d' ' -f1) --auth.jwt-secret=/home/arangouser/arangoSecret --starter.join \${Instance1.PrivateIp}
            path: /usr/bin/start-arango.sh
          - content: |
              [Unit]
              Description=Run the ArangoDB Starter
              After=network.target
              [Service]
              Restart=on-failure
              ExecStart=/bin/bash /usr/bin/start-arango.sh
              TimeoutStopSec=60
              LimitNOFILE=1048576
              [Install]
              WantedBy=multi-user.target
            path: /etc/systemd/system/arango-cluster.service
          packages:
          - amazon-ssm-agent
          runcmd:
          - ${installArangoString}
          - systemctl enable amazon-ssm-agent;
          - systemctl start amazon-ssm-agent;
          - systemctl enable arango-cluster;
          - systemctl start arango-cluster;
          `)),
          tagSpecifications: [
            {
              resourceType: 'instance',
              tags: [
                {
                  key: 'update',
                  value: 'true'
                },
                {
                  key: 'Name',
                  value: `${environmentName} - ArangoDB Instance 2`
                }
              ]
            }
          ],
          instanceMarketOptions: (useSpot) ? {
            marketType: 'spot',
            spotOptions: {
              instanceInterruptionBehavior: 'stop',
              spotInstanceType: 'persistent'
            }
          } : undefined
        }
      })
      Template2.addDependsOn(instance1)
      const instance2 = new ec2.CfnInstance(this, 'Instance2', {
        subnetId: subnet2.subnetId,
        securityGroupIds: securityGroups.split(','),
        launchTemplate: {
          launchTemplateId: Template2.ref,
          version: Template2.attrLatestVersionNumber
        },
        availabilityZone: subnet2.availabilityZone
      })
      const Template3 = new ec2.CfnLaunchTemplate(this, 'Template3', {
        launchTemplateData: {
          ebsOptimized: true,
          iamInstanceProfile: (instanceRoleName) ? {
            name: instanceRoleName
          } : undefined,
          blockDeviceMappings: [
            {
              deviceName: '/dev/xvda',
              ebs: {
                encrypted: true,
                deleteOnTermination: true,
                volumeSize: volumeSize,
                volumeType: volumeType,
                iops: (volumeType === 'io1') ? parseInt(volumeIops) : undefined
              }
            }
          ],
          keyName: (keyName) ? keyName : undefined,
          imageId: ec2Ami,
          instanceType: instanceType,
          monitoring: {
            enabled: true
          },
          userData: cdk.Fn.base64(cdk.Fn.sub(`
          #cloud-config
          repo_update: true
          repo_upgrade: all
          users:
          - default
          - name: arangouser
          write_files:
          - content: ${jwtSecret}
            path: /home/arangouser/arangoSecret
          - content: |
              #!/bin/bash
              /usr/bin/arangodb --starter.address=$(echo $(hostname -I) | cut -d' ' -f1) --auth.jwt-secret=/home/arangouser/arangoSecret --starter.join \${Instance1.PrivateIp}
            path: /usr/bin/start-arango.sh
          - content: |
              [Unit]
              Description=Run the ArangoDB Starter
              After=network.target
              [Service]
              Restart=on-failure
              ExecStart=/bin/bash /usr/bin/start-arango.sh
              TimeoutStopSec=60
              LimitNOFILE=1048576
              [Install]
              WantedBy=multi-user.target
            path: /etc/systemd/system/arango-cluster.service
          packages:
          - amazon-ssm-agent
          runcmd:
          - ${installArangoString}
          - systemctl enable amazon-ssm-agent;
          - systemctl start amazon-ssm-agent;
          - systemctl enable arango-cluster;
          - systemctl start arango-cluster;
          `)),
          tagSpecifications: [
            {
              resourceType: 'instance',
              tags: [
                {
                  key: 'update',
                  value: 'true'
                },
                {
                  key: 'Name',
                  value: `${environmentName} - ArangoDB Instance 3`
                }
              ]
            }
          ],
          instanceMarketOptions: (useSpot) ? {
            marketType: 'spot',
            spotOptions: {
              instanceInterruptionBehavior: 'stop',
              spotInstanceType: 'persistent'
            }
          } : undefined
        }
      })
      Template3.addDependsOn(instance1)
      const instance3 = new ec2.CfnInstance(this, 'Instance3', {
        subnetId: subnet3.subnetId,
        securityGroupIds: securityGroups.split(','),
        launchTemplate: {
          launchTemplateId: Template3.ref,
          version: Template3.attrLatestVersionNumber
        },
        availabilityZone: subnet3.availabilityZone
      })
    } else {
      throw new Error('This app only supports ArangoDB version 3.4 or higher')
    }
  }
}
