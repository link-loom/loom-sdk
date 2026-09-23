module.exports = {
  item: [
    { httpRoute: '/visible', route: '/routes/api/item/item.route', handler: 'visible', method: 'GET', auth: 'token' },
    { httpRoute: '/public', route: '/routes/api/item/item.route', handler: 'visible', method: 'GET', auth: 'public' },
    { httpRoute: '/misconfigured', route: '/routes/api/item/item.route', handler: 'visible', method: 'GET', auth: 'unknown-handler' },
    { httpRoute: '/', route: '/routes/api/item/item.route', handler: 'create', method: 'POST', auth: 'token' },
  ],
};
