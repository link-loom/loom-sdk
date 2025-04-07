const EventUtil = require('../utils/event.util');
const GeneratorUtil = require('../utils/generator.util');
const CryptoUtil = require('../utils/crypto.util');
const IOUtil = require('../utils/io.util');
const LangUtil = require('../utils/lang.utils');
const SanitizerUtil = require('../utils/sanitizer.util');
const SearchUtil = require('../utils/search.util');
const EncoderUtil = require('../utils/encoder.util');
const ValidatorUtil = require('../utils/validator.util');

class UtilitiesModule {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */
    this._dependencies.utilities = this;

    /* Assigments */
    this._namespace = '[Server]::[Utilities]::[Manager]';
    this._validatorUtil = new ValidatorUtil(this._dependencies);
    this._eventUtil = new EventUtil(this._dependencies);
    this._generatorUtil = new GeneratorUtil(this._dependencies);
    this._ioUtil = new IOUtil(this._dependencies);
    this._langUtil = new LangUtil(this._dependencies);
    this._sanitizerUtil = new SanitizerUtil(this._dependencies);
    this._searchUtil = new SearchUtil(this._dependencies);
    this._encoderUtil = new EncoderUtil(this._dependencies);
    this._cryptoUtil = new CryptoUtil(this._dependencies);
  }

  setup() {
    this._console.success('Loading', { namespace: this._namespace });

    this._langUtil.setup();

    this._console.success('Loaded', { namespace: this._namespace });
  }

  get generator() {
    return this._generatorUtil.generator;
  }

  get crypto() {
    return this._cryptoUtil.crypto;
  }

  get validator() {
    return this._validatorUtil.validator;
  }

  get sanitizer() {
    return this._sanitizerUtil.sanitizer;
  }

  get encoder() {
    return this._encoderUtil.encoder;
  }

  get io() {
    return this._ioUtil;
  }

  get search() {
    return this._searchUtil.search;
  }

  get event() {
    return this._eventUtil;
  }
}

module.exports = { UtilitiesModule };
