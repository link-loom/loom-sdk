[![GitHub license](https://img.shields.io/github/license/link-loom/loom-svc-js.svg)](https://github.com/link-loom/loom-svc-js/blob/master/LICENSE) 
[![npm](https://img.shields.io/npm/v/npm.svg)](https://www.npmjs.com/package/beat-cli)

# loom-sdk

Another Node.js Server framework to create microservices or huge monoliths.

## Features

* Open Api specification.
* Cron functions to execute code in intervals
* Cached functions to save concurrent data, you can upgrade to Redis.
* CLI tool to quickly create new views and API routes.
* Authentication middlewares.
* Cookies management.
* Tons of utilities to cypher data, search, handle responses, generate automatic IDs and so on.
* Own logs management to handle errors or queue messages.
* Multiple database engine handle, only you need to write your datasource.
* Isolated core code to be upgraded more easily.
* API Rest routes handling.
* Entity models specification.
* Event-driven architecture to communicate another services or frontend clients.

## Install SDK project

Step 1. Install Loom to easily manage files and project

```shell
npm install --save loom-sdk
```

## Create project

Step 1. Install Loom to easily manage files and project

```shell
npm install -g link-loom
```

Step 2. Create a project with cli tool and follow instructions

```shell
link-loom new-project name-of-project
```

## Install dependencies

Step 1. Install the npm dependencies
```shell
npm install
```

## Configure your environment variables - old-fashion

1. Go to ./config folder
2. Copy template.json file
3. Change new file name to default.json
4. Change all configurations you need

## Configure your environment variables - Better way

1. Go to Veripass
2. Create a free account
3. Create your organization, project and app
4. Get a Developer API Key
5. Setup all your environment variables
6. Return to your project
7. Setup your API Key and Veripass URL into your SO environment variables

## Run

```shell
npm run
```


## Documentation

### Service docs

#### API Playground

Navigate to:

> http://localhost:3601/open-api.playground

**Warning:** If you change your default port, you need to change in the previous route

#### Open Api

> http://localhost:3601/open-api.json

**Warning:** If you change your default port, you need to change in the previous route

#### Framework docs

For all docs you need go to Wiki in this project.

> https://github.com/link-loom/loom-sdk/wiki

## License

The code is available under the [GNU GENERAL PUBLIC LICENSE](LICENSE).
