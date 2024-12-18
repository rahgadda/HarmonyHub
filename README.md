# HarmonyHub

## Overview
- This is a Visual API Orchestrator POC created for Rest API Calls.
- UI Generates YAML. Written in static HTML using WebComponents. 
- Python-based `CLI` is used to run YAML generated from UI. It can sequence and execute API Calls.

## Commands
- harmonyhub_cli init
  - harmonyhub_cli init --file workflow.yaml
- harmonyhub_cli run <<workflow.yaml>>
  - pyyaml2apiworkflow run <<workflow.yaml>> --debug
- harmonyhub_cli server
- harmonyhub_cli --help
- harmonyhub_cli --version

## Operator Supported
- Simple comparisons (==, !=, >, <, >=, <=)
- Logical operations (and, or, not)
- Basic arithmetic operations (+, -, *, /, %)

## Body Templating Engine
- Python [Jija2](http://jinja.quantprogramming.com/)

## Output Parser
- [JQ](https://www.devtoolsdaily.com/jq_playground/)

## System Defined Variables
- RestAPI
  - $today_datetime
  - $today_date
  - $today_time
  - $today_date_zero_time
  - $request_http_method
  - $request_url
  - $request_headers
  - $request_body
  - $response_http_status
  - $response_headers
  - $response_body
  - $random.randint(1000,9999)
  - $random.uniform(15.5, 80.5)
- Database
  - $response_body

## Roadmap
- GraphQL
- Grpc
- Kafka

## Demo
- Demo created [here](https://app.beeceptor.com/console/automation-demo)

## Credits
- Below are projects used as inspiration
  - [Stepci](https://stepci.com/)
  - [Apache Karavan](https://github.com/apache/camel-karavan)
