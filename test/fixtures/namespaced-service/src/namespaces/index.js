module.exports = [
  { name: 'alpha', root: 'namespaces/alpha', prefix: '/alpha' },
  { name: 'beta', root: 'namespaces/beta', prefix: '' },
  { name: 'broken', root: 'namespaces/broken' },
  { name: 'ghost', root: 'namespaces/ghost' },
  { name: 'missing', root: 'namespaces/does-not-exist' },
  { name: 'alpha', root: 'namespaces/beta' },
  { root: 'namespaces/beta' },
];
