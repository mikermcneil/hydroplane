module.exports = {


  friendlyName: 'Update routes',


  description: '',


  inputs: {

    routesJs: {
      description: 'A code string containing a dictionary of routes, in the style of sails.config.routes.',
      type: 'string',
      required: true,
    }
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // An example, if you want a quick hack to approximate actions2 in the mean time:
    // ```
    // {
    //   '/zapier/receive': (req, res)=>{
    //     // this outer IIFE is just because I was too lazy to set everything up the nice way.  See code for more info
    //     // (if you need to get more custom, scrap it)
    //     (async()=>{
    //       // Here's where to do your stuff:
    //       return 'hello';
    //     })()
    //     .then((resultMaybe)=>{res.ok(resultMaybe);})
    //     .catch((err)=>{res.serverError(err);})
    //   },
    // }
    // ```
    //
    // You can also just do `async (req, res)=>{…}`.
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  },


  fn: async function ({ routesJs }) {

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // FUTURE: Replace this with something more complete that lets you use action definitions.
    // I just did it this way because it was the easiest way to get it working in like an hour
    // Easiest way to do actions would probably be to let you actually manage a list of actions
    // that are stored in the database, and then still require manually routing to them.
    // Obviously it can be done much more nicely than that (see treeline2) but this would be
    // the easy way.
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // Don't look too closely at this unless you want to be disappointed.
    // This business here is a dirty hack, so we'll just shove the original routes into
    // Mike's party pocket™, because trying to do this as quickly as possible.
    // (The right way to do this is a hook.)
    if (0 === await Platform.count()) {
      await Platform.create({ routesJs });
    }//ﬁ
    sails._mikesPartyPocketWithTheOriginalRoutesAtLiftTime = Object.assign({}, sails.config.routes);
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Persist the new (unmerged) routes to the database.
    await Platform.update({}).set({ routesJs });

    // Reify the code string
    let newlyParsedRoutes;
    eval(`newlyParsedRoutes = ${routesJs};`);

    // Apply the routes to the running Sails app itself.
    sails.router.flush(
      Object.assign({}, sails._mikesPartyPocketWithTheOriginalRoutesAtLiftTime, newlyParsedRoutes)
    );

  }


};
