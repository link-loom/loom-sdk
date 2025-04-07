module.exports = {
  string: {
    name: 'string',
    default: '',
  },
  number: {
    name: 'number',
    default: 0,
  },
  array: {
    name: 'array',
    default: [],
  },
  object: {
    name: 'object',
    default: {},
  },
  timestamp: {
    name: 'date',
    default: new Date().getTime() + '',
  },
  date: {
    name: 'date',
    default: new Date(),
  },
  boolean: {
    name: 'boolean',
    default: false,
  },
  serial: {
    name: 'serial',
    default: '',
  },
  bigserial: {
    name: 'bigserial',
    default: '',
  },
  macaddr: {
    name: 'macaddr',
    default: '',
  },
  inet: {
    name: 'inet',
    default: '0.0.0.0',
  },
  tsquery: {
    name: 'tsquery',
    default: '',
  },
  tsvector: {
    name: 'tsvector',
    default: '',
  },
  xml: {
    name: 'xml',
    default: '',
  },
};
