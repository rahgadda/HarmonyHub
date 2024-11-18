# HarmonyHub

## Overview
- This is a Visual API Orchestrator POC created for Rest API Calls.
- UI Generates YAML. Written in static HTML using WebComponents. 
- Python-based `CLI` is used to run YAML generated from UI. It can sequence and execute API Calls.

## Commands
- harmonyhub init
  - harmonyhub init <<workflow.yaml>>
- harmonyhub run <<workflow.yaml>>
  - pyyaml2apiworkflow run <<workflow.yaml>> --debug
- harmonyhub --help
- harmonyhub --version

## Operator Supported
- Simple comparisons (==, !=, >, <, >=, <=)
- Logical operations (and, or, not)
- Basic arithmetic operations (+, -, *, /, %)

## Output Parser
- [JQ](https://www.devtoolsdaily.com/jq_playground/)

## System Defined Variables
- $response
- $request
- $http_status

## Roadmap
- GraphQL
- Grpc
- Kafka

## Credits
- Below are projects used as inspiration
  - [Stepci](https://stepci.com/)
  - [Apache Karavan](https://github.com/apache/camel-karavan)
