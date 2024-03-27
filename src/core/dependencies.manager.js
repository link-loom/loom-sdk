class DependenciesManager {
  constructor(args) {
    /* Base Properties */
    this._args = args;

    /* Custom Properties */
    this._dependencies = this._args;

    /* Assigments */
    this._namespace = '[Server]::[Dependencies]::[Manager]';
  }

  async setup() {
    const isLoadedDependecies = await this.loadDependencies();
    return isLoadedDependecies;
  }

  async loadDependencies() {
    console.log(` ${this._namespace}: Loading`);

    const request = require('axios');
    const root = this._args.root;
    const http = require('http');
    const events = require('events');
    const expressModule = require('express');
    const express = expressModule();
    const httpServer = http.createServer(express);
    const socketModule = require('socket.io');
    const websocketClientModule = require('socket.io-client');
    const multerModule = require('multer');
    const dotenv = require('dotenv').config();
    const config = require('config');

    this._dependencies = {
      root,
      http,
      multerModule,
      express,
      events,
      httpServer,
      socketModule,
      websocketClientModule,
      expressModule,
      request,
      dotenv,
      aesjs: require('aes-js'),
      cors: require('cors'),
      path: require('path'),
      moment: require('moment'),
      crypto: require('crypto'),
      config: {},
      helmet: require('helmet'),
      bcrypt: require('bcryptjs'),
      jwt: require('jsonwebtoken'),
      colors: require('colors/safe'),
      compress: require('compression'),
      nodemailer: require('nodemailer'),
      bodyParser: require('body-parser'),
      cookieParser: require('cookie-parser'),
      exceljs: require('exceljs'),
      swaggerJsdoc: require('swagger-jsdoc'),
      swaggerUi: require('swagger-ui-express'),
    };

    const isConfigLoaded = await this.#loadConfig(config);

    if (!isConfigLoaded) {
      console.error(
        ` ${this._dependencies.colors.green(
          this._namespace,
        )}: Error occurred while loading configuration`,
      );
      return false;
    }

    this.#importCustomDependencies();

    console.log(` ${this._dependencies.colors.green(this._namespace)}: Loaded`);
    return true;
  }

  async #loadConfig(config) {
    try {
      const hasVeripassConfiguration = this.#validateVeripassConfig();

      if (hasVeripassConfiguration) {
        return this.#loadConfigFromVeripass();
      }

      return this.#loadConfigFile(config);
    } catch (error) {
      return false;
    }
  }

  #validateVeripassConfig() {
    if (!process.env.VERIPASS_SERVICE_URL || !process.env.VERIPASS_API_KEY) {
      return false;
    }

    return true;
  }

  #objectIsEmpty(obj) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return false;
      }
    }
    return true;
  }

  async #loadConfigFromVeripass() {
    try {
      const veripassServiceUrl = process.env.VERIPASS_SERVICE_URL;
      const veripassApiKey = process.env.VERIPASS_API_KEY;

      const veripassResponse = await this._dependencies.request.get(
        `${veripassServiceUrl}/?environment_type=${veripassEnvironmentName ?? 'development'}`,
        {
          headers: {
            Authorization: `Bearer ${veripassApiKey}`,
          },
        },
      );

      const veripassConfig =
        veripassResponse.data?.result?.matchedItems?.[0]?.variables;

      this._dependencies.config = veripassConfig;
      return true;
    } catch (error) {
      console.error(
        ` ${this._dependencies.colors.green(
          this._namespace,
        )}: Error loading Veripass configuration`,
      );
      return false;
    }
  }

  #loadConfigFile(config) {
    try {
      if (this.#objectIsEmpty(config)) {
        return false;
      }

      this._dependencies.config = config;
      return true;
    } catch (error) {
      return false;
    }
  }

  #importCustomDependencies() {
    const dependencies = this._dependencies.config.CUSTOM_DEPENDENCIES;

    if (!dependencies || !dependencies.length) {
      return;
    }

    console.log(
      ` ${this._dependencies.colors.green(
        this._namespace,
      )}: Loading custom dependencies`,
    );
    dependencies.map((customDependency) => {
      console.log(
        ` ${this._dependencies.colors.cyan(this._namespace)}: Loading ${
          customDependency.name
        } dependency`,
      );
      this._dependencies[customDependency.name] = require(
        customDependency.package,
      );
      return customDependency;
    });
    console.log(
      ` ${this._dependencies.colors.green(
        this._namespace,
      )}: Loaded custom dependencies`,
    );
  }

  getDependencies() {
    return this._dependencies;
  }

  addCustomDependency(dependency, name) {
    this._dependencies[name] = dependency;
  }

  get get() {
    return this.getDependencies;
  }

  get core() {
    return {
      add: this.addCustomDependency.bind(this),
      get: this.getDependencies.bind(this),
    };
  }
}

module.exports = { DependenciesManager };
