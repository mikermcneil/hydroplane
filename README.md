# hydroplane

Sometimes for internal automation tasks you want to deploy code extremely quickly, but you want all the goodies from Sails and don't really feel like fiddling with Lambda et al.

This is not something you should use for production web traffic.  I built it in like 2 hours and it literally uses `eval()`.

It is for internal automations.

(a [Sails v1](https://sailsjs.com) application)


### Getting started
1. Fork this repo
2. Deploy it, using whatever database you like

##### Things you won't need:
- You will only need one compute instance, so you can get away without Redis this time if you want.  (But setting up Redis will mean you won't get randomly logged out, which is nice.  I would set up Redis.)
- You probably won't need password reset or contact form emails, so you can skip Mailgun.
- Unless you're trying to charge for this, you won't need payments either, so skip Stripe.

### Deployment
You can deploy hydroplane however/wherever you want for your own uses.

For convenience, this repo also includes a built-in way on top of Heroku that's handy if you're working on the underlying source code.

1. Set GitHub Secrets:
  - _you can set these in "Settings > Secrets" in the GitHub UI, as of like Feb 2021.  They'll probably change it at some point but, you've got this!  They're lurking in the UI somewhere._
  - `HEROKU_API_TOKEN_FOR_DEPLOYMENT` (your heroku api token)
  - `HEROKU_EMAIL_FOR_DEPLOYMENT` (your heroku login email)
2. Create a heroku app, set up a database, add redis and Papertrail too, if you can be bothered.  Free tiers are fine.  (If you're using a SQL database, use a wipe script to set up the tables- e.g. set database url in `package.json` and then `sails run wipe`
  - Example of working add-ons and config (you can also use a free tier dyno if you don't mind it going to sleep and then hanging.  You probably want to pay them though, because a lot of automation systems you might be integrating with will time out.)
    - ![image](https://user-images.githubusercontent.com/618009/107864140-45431d80-6e1f-11eb-9ffc-17ad30d74431.png)
    - ![image](https://user-images.githubusercontent.com/618009/107864156-5b50de00-6e1f-11eb-9154-1a8d0d9516de.png)

3. Optional: `npm install` your database adapter and configure it in config/env/production.js.  (This is set up to use sails-mysql in production already by default, so if you're cool with that, you don't need to install anything.)
4. Configure the app to know its own URL in the production config (`baseUrl` and `sockets.onlyAllowOrigins`).  Note that other settings necessary for Heroku (secure cookies and trust proxy config) are already enabled.
5. Customize the github action in this repo to make it point at your heroku app  (FUTURE: change the action so it uses a github secret for the app name too, so that this step can be simplified)
6. Customize the github action in this repo to point at your repo (it has a failsafe at the top to prevent deploying on every 3rd party PR)
7. Push something to master and it will deploy.


### Links

+ [Sails framework documentation](https://sailsjs.com/get-started)
+ [Version notes / upgrading](https://sailsjs.com/documentation/upgrading)
+ [Deployment tips](https://sailsjs.com/documentation/concepts/deployment)
+ [Community support options](https://sailsjs.com/support)
+ [Professional / enterprise options](https://sailsjs.com/enterprise)


### Version info

This app was originally generated on Sat Feb 13 2021 15:02:27 GMT-0600 (Central Standard Time) using Sails v1.4.0.

<!-- Internally, Sails used [`sails-generate@2.0.0`](https://github.com/balderdashy/sails-generate/tree/v2.0.0/lib/core-generators/new). -->


This project's boilerplate is based on an expanded seed app provided by the [Sails core team](https://sailsjs.com/about) to make it easier for you to build on top of ready-made features like authentication, enrollment, email verification, and billing.  For more information, [drop us a line](https://sailsjs.com/support).


<!--
Note:  Generators are usually run using the globally-installed `sails` CLI (command-line interface).  This CLI version is _environment-specific_ rather than app-specific, thus over time, as a project's dependencies are upgraded or the project is worked on by different developers on different computers using different versions of Node.js, the Sails dependency in its package.json file may differ from the globally-installed Sails CLI release it was originally generated with.  (Be sure to always check out the relevant [upgrading guides](https://sailsjs.com/upgrading) before upgrading the version of Sails used by your app.  If you're stuck, [get help here](https://sailsjs.com/support).)
-->

