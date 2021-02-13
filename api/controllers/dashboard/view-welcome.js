module.exports = {


  friendlyName: 'View welcome page',


  description: 'Display the dashboard "Welcome" page.',


  exits: {

    success: {
      viewTemplatePath: 'pages/dashboard/welcome',
      description: 'Display the welcome page for authenticated users.'
    },

  },


  fn: async function () {

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // Don't look too closely at this unless you want to be disappointed.
    // This business here is a dirty hack, because trying to do this as quickly as possible.
    // (The right way to do this is a hook.)
    if (0 === await Platform.count()) {
      await Platform.create({});
    }//ﬁ
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Fetch routes from database and pass them down to the view for prefilling.
    return {
      routesJs: (await Platform.find())[0].routesJs
    };

  }


};
