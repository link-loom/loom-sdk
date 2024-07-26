const path = require('path');

class SimpleProperty {
  constructor({ value, type }) {
    this._value = value;
    this._type = type;
  }

  get value() {
    return this._value ?? this._type.default;
  }

  setBaseProperties(baseProperties) {
    this._value = baseProperties._value;
    return this;
  }
}

class ComplexProperty {
  constructor({ value, model, type, dependencies }) {
    const typeDef = dependencies.DataTypesManager.getType(type.name);
    this._value = value ? new model(value, dependencies) : typeDef.default;
    this._type = type;
  }

  get value() {
    return this._value?.get ?? '';
  }

  setBaseProperties(baseProperties) {
    this._value.setBaseProperties(baseProperties);
    return this;
  }
}

class Property {
  constructor({ value, type, dependencies }) {
    if (!dependencies) {
      return new SimpleProperty({ value, type });
    }
    var types = dependencies.DataTypesManager.types;
    var typeModel = dependencies.ModelsManager.models[type.name];
    var complexType = types[type.name]?.default ?? {};

    if (typeof type === 'function' || complexType) {
      return new ComplexProperty({ value, model: typeModel, type, dependencies });
    } else {
      this._value = value;
      this._type = type;
    }
  }

  setBaseProperties(baseProperties) {
    if (this instanceof SimpleProperty || this instanceof ComplexProperty) {
      this.setBaseProperties(baseProperties);
    }
    return this;
  }
}

module.exports = { SimpleProperty, ComplexProperty, Property };
