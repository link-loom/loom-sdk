module.exports = {
  probe: [
    { httpRoute: '/visible', route: '/routes/api/probe/probe.route', handler: 'visible', method: 'GET' },
    { httpRoute: '/items', route: '/routes/api/probe/probe.route', handler: 'create', method: 'POST' },
  ],
};
