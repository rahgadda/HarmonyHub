# HarmonyHub

## Overview
- This is a Visual API Orchestrator POC created for Rest API Calls.
- UI Generates YAML. Written in static HTML using WebComponents. 
- Python-based `CLI` is used to run YAML generated from UI. It can sequence and execute API Calls.

## Commands
- harmonyhub-cli init
  - harmonyhub-cli init --file workflow.yaml
- harmonyhub_cli run <<workflow.yaml>>
  - harmonyhub-cli run <<workflow.yaml>> --debug
  - harmonyhub-cli run <<workflow.yaml>> --toolsFile <<integration.yaml>> --debug
- harmonyhub-cli server
- harmonyhub-cli --help
- harmonyhub-cli --version

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
- Kafka
- GraphQL
- Grpc

## Demo
- Demo created [here](https://rahulkirangaddam.is-a.dev/HarmonyHub/)
  ```bash
  # https://pypi.org/project/harmonyhub-cli/
  pip install harmonyhub-cli/
  harmonyhub-cli serve
  ```
  ```bash
  # To run yaml generated standalone
  harmonyhub-cli <<file name.yaml>>
  ```

## Credits
- Below are projects used as inspiration
  - [Stepci](https://stepci.com/)
  - [Apache Karavan](https://github.com/apache/camel-karavan)
