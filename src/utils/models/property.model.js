const path = require('path');

class SimpleProperty {
  constructor({ value, type }) {
    this._value = value;
    this._type = type;
  }

  get value() {
    return this._value ?? this._type.default;
  }

  set value(newValue) {
    this._value = newValue;
  }

  setBaseProperties(baseProperties) {
    this._value = baseProperties._value;
    return this;
  }
}

class ComplexProperty {
  constructor({ value, model, type, dependencies }) {
    const typeDef = dependencies.DataTypesModule.getType(type.name);

    this._value = value ? new model(value, dependencies) : typeDef.default;
    this._type = type;
  }

  get value() {
    return this._value?.get ?? '';
  }

  set value(newValue) {
    if (this._value && typeof this._value === 'object' && '_value' in this._value) {
      this._value._value = newValue;
    } else {
      this._value = newValue;
    }
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

    var types = dependencies.DataTypesModule.types;
    var typeModel = types[type.name];
    var complexType = types[type.name]?.default ?? {};

    if (typeof type === 'function' || complexType) {
      return new ComplexProperty({ value, model: complexType.constructor, type: typeModel, dependencies });
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
