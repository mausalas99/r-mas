'use strict';

const {
  mountEquiposReadRoutes,
  mountEquiposCustodyRoutes,
  mountEquiposAlertRoutes,
} = require('./equipos-router-routes-custody.js');
const { mountEquiposAdminRoutes } = require('./equipos-router-routes-admin.js');

/**
 * @param {object} r express Router
 * @param {object} ctx
 */
function mountEquiposRoutes(r, ctx) {
  mountEquiposReadRoutes(r, ctx);
  mountEquiposCustodyRoutes(r, ctx);
  mountEquiposAlertRoutes(r, ctx);
  mountEquiposAdminRoutes(r, ctx);
}

module.exports = { mountEquiposRoutes };
