// load packages
var express = require('express');

// load cores
var misc = require('../../core/lib/misc');

// load modules
var Account = require('../../module/account');
var Site = require('../../module/site');

// load locals
var app = require('./app.json');
var menu = require('./menu');

// init
var router = express.Router();
var routeTable = misc.getRouteData();
var appLocals = Site.exposeAppLocals(app.locals, menu);

// middleware
router.use(Account.middleware.exposeLocals);

// route
router.use(routeTable.account.root, Account.site);
router.post(routeTable.account.root + routeTable.account.registerSimple, Account.middleware.checkLoggedSession, Account.registerSimple);
router.post(routeTable.account.root + routeTable.account.add, Account.registerSimple);

// bind static page
Site.bindMenu(menu, router);

module.exports = {
    config: app.config,
    exposeLocals: appLocals,
    router: router,
};
