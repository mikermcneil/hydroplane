module.exports = {


  friendlyName: 'Update routes',


  description: '',


  inputs: {

    routes: {
      description: 'A code string containing a dictionary of routes, in the style of sails.config.routes.',
      type: 'string',
      required: true,
    }

  },


  fn: async function ({ routes }) {

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // FUTURE: Replace this with something more complete that lets you use action definitions.
    // I just did it this way because it was the easiest way to get it working in like an hour
    // Easiest way to do actions would probably be to let you actually manage a list of actions
    // that are stored in the database, and then still require manually routing to them.
    // Obviously it can be done much more nicely than that (see treeline2) but this would be
    // the easy way.
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    if (!sails._mikesPartyPocketWithTheOriginalRoutesAtLiftTime) {
      // This business here is a dirty hack, so we'll just shove the original routes into
      // Mike's party pocket™, because trying to do this as quickly as possible.
      // (The right way to do this is a hook.)
      sails._mikesPartyPocketWithTheOriginalRoutesAtLiftTime = Object.assign({}, sails.config.routes);
    }

    let newRoutes = Object.assign({}, sails._mikesPartyPocketWithTheOriginalRoutesAtLiftTime, routes);

    // TODO persist to database, at least

    sails.router.flush(newRoutes);

  }


};
