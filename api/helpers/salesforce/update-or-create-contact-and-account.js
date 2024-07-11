module.exports = {


  friendlyName: 'Update or create contact and account',


  description: 'Upsert contact±account into Salesforce given fresh data about a particular person, and fresh IQ-enrichment data about the person and account.',


  inputs: {

    // Find by…
    emailAddress: { type: 'string' },
    linkedinUrl: { type: 'string' },

    // Set…
    firstName: { type: 'string', required: true },
    lastName: { type: 'string', required: true },
    organization: { type: 'string' },
    primaryBuyingSituation: { type: 'string' },
    psychologicalStage: {
      type: 'string',
      isIn: [
        '1 - Unaware',
        '2 - Aware',
        '3 - Intrigued',
        '4 - Has use case',
        '5 - Personally confident',
        '6 - Has team buy-in'
      ]
    },
    leadSource: {
      type: 'string',
      isIn: [
        'Website - Contact forms',
        'Website - Sign up',
        'Website - Waitlist',
        'Website - swag request',
        'Outbound - Dripify',
      ],
    },
  },


  exits: {

    success: {
      outputType: {
        salesforceAccountId: 'string',
        salesforceContactId: 'string'
      }
    },

  },


  fn: async function ({emailAddress, linkedinUrl, firstName, lastName, organization, primaryBuyingSituation, psychologicalStage, leadSource}) {

    require('assert')(sails.config.custom.salesforceIntegrationUsername);
    require('assert')(sails.config.custom.salesforceIntegrationPasskey);
    require('assert')(sails.config.custom.iqSecret);
    require('assert')(sails.config.custom.RX_PROTOCOL_AND_COMMON_SUBDOMAINS);


    if(!emailAddress && !linkedinUrl){
      throw new Error('UsageError: when updating or creating a contact and account in salesforce, either an email or linkedInUrl is required.');
    }

    // Log in to Salesforce.
    let jsforce = require('jsforce');
    let salesforceConnection = new jsforce.Connection({
      loginUrl : 'https://fleetdm.my.salesforce.com'
    });
    await salesforceConnection.login(sails.config.custom.salesforceIntegrationUsername, sails.config.custom.salesforceIntegrationPasskey);

    let salesforceContactId;
    let salesforceAccountId;
    let salesforceAccountOwnerId;

    // Build a dictionary of values we'll update/create a contact record with.
    let valuesToSet = {};
    if(emailAddress){
      valuesToSet.Email = emailAddress;
    }
    if(linkedinUrl){
      valuesToSet.LinkedIn_profile__c = linkedinUrl;// eslint-disable-line camelcase
    }
    if(primaryBuyingSituation) {
      valuesToSet.Primary_buying_situation__c = primaryBuyingSituation;// eslint-disable-line camelcase
    }
    if(psychologicalStage) {
      valuesToSet.Stage__c = psychologicalStage;// eslint-disable-line camelcase
    }


    let existingContactRecord;
    // Search for an existing Contact record using the provided email address or linkedIn profile URL.
    if(emailAddress) {
      existingContactRecord = await salesforceConnection.sobject('Contact')
      .findOne({
        Email:  emailAddress,
      });
    } else if(linkedinUrl) {
      existingContactRecord = await salesforceConnection.sobject('Contact')
      .findOne({
        LinkedIn_profile__c: linkedinUrl // eslint-disable-line camelcase
      });
    }

    if(existingContactRecord) {
      // console.log(`Exisitng contact found! ${existingContactRecord.Id}`);
      // If we found an existing contact, we'll update it with the information provided.
      salesforceContactId = existingContactRecord.Id;
      await salesforceConnection.sobject('Contact')
      .update({
        Id: salesforceContactId,
        ...valuesToSet,
      });
      salesforceAccountId = existingContactRecord.AccountId;
      // Look up the account to see if it is owned by the integrations admin user, if it is, we'll round robin it.
      let accountRecord = await sails.helpers.flow.build(async ()=>{
        return await salesforceConnection.sobject('Account')
        .retrieve(salesforceAccountId);
      }).intercept((err)=>{
        return new Error(`When attempting to look up an Account record (ID: ${salesforceAccountId}), An error occured when retreiving the specified record. Error: ${err}`);
      });
      salesforceAccountOwnerId = accountRecord.OwnerId;
      if(salesforceAccountOwnerId === '0054x00000735wDAAQ' && salesforceAccountId !== '0014x000025JC8DAAW') {
        // Get all round robin users.
        let roundRobinUsers = await salesforceConnection.sobject('User')
        .find({
          AE_Round_robin__c: true,// eslint-disable-line camelcase
        });
        // Get the user with the earliest round robin timestamp.
        let userWithEarliestAssignTimeStamp = _.sortBy(roundRobinUsers, 'AE_Account_Assignment_round_robin__c')[0];

        let today = new Date();
        let nowOn = today.toISOString().replace('Z', '+0000');
        // Update the salesforceAccountOwnerId value to be the ID of the next user in the round robin.
        salesforceAccountOwnerId = userWithEarliestAssignTimeStamp.Id;
        // Update this user to put them at the bottom of the round robin list.
        await salesforceConnection.sobject('User')
        .update({
          Id: salesforceAccountOwnerId,
          // eslint-disable-next-line camelcase
          AE_Account_Assignment_round_robin__c: nowOn
        });
        // Reassign the account to the new owner.
        await salesforceConnection.sobject('Account')
        .update({
          Id: salesforceAccountId,
          OwnerId: salesforceAccountOwnerId
        });
      }
      // console.log(`${salesforceContactId} updated!`);
    } else {
      // Otherwise, we'll enrich the information we have, and check for an existing account.
      if(linkedinUrl){
        // If linkedinUrl was provided, strip the protocol and subdomain from the URL.
        linkedinUrl = linkedinUrl.replace(sails.config.custom.RX_PROTOCOL_AND_COMMON_SUBDOMAINS, '');
      }
      // Send the information we have to the enrichment helper.
      let enrichmentData = await sails.helpers.iq.getEnriched(emailAddress, linkedinUrl, firstName, lastName, organization);
      // console.log(enrichmentData);
      // Add information from the enrichmentData to the values to set on the new Contact record.
      if(enrichmentData.person && enrichmentData.person.linkedinUrl){
        valuesToSet.LinkedIn_profile__c = enrichmentData.person.linkedinUrl;// eslint-disable-line camelcase
      }
      if(enrichmentData.person && enrichmentData.person.title){
        valuesToSet.Title = enrichmentData.person.title;
      }
      if(!enrichmentData.employer || !enrichmentData.employer.emailDomain || !enrichmentData.employer.organization) {
        // Special sacrificial meat cave where the contacts with no organization go.
        // https://fleetdm.lightning.force.com/lightning/r/Account/0014x000025JC8DAAW/view
        salesforceAccountId = '0014x000025JC8DAAW';
        salesforceAccountOwnerId = '0054x00000735wDAAQ';// « "Integrations admin" user.
      } else {
        // Search for an existing Account record by the organization returned from the getEnriched helper.
        let existingAccountRecord = await salesforceConnection.sobject('Account')
        .findOne({
          'Name':  enrichmentData.employer.organization,
          // 'LinkedIn_company_URL__c': enrichmentData.employer.linkedinCompanyPageUrl // TODO: if this information is not present on an existing account, nothing will be returned.
        });
        // If we didn't find an account that's name exaclty matches, we'll do another search using the provided email domain.
        if(!existingAccountRecord){
          existingAccountRecord = await salesforceConnection.sobject('Account')
          .findOne({
            'Website':  enrichmentData.employer.emailDomain,
            // 'LinkedIn_company_URL__c': enrichmentData.employer.linkedinCompanyPageUrl // TODO: if this information is not present on an existing account, nothing will be returned.
          });
        }
        // console.log(existingAccountRecord);
        // If we found an exisitng account and it is not owned by the integrations admin, we'll use assign the new contact to the account owner.
        if(existingAccountRecord && existingAccountRecord.OwnerId !== '0054x00000735wDAAQ') {
          // Store the ID of the Account record we found.
          salesforceAccountId = existingAccountRecord.Id;
          salesforceAccountOwnerId = existingAccountRecord.OwnerId;
          // console.log('exising account found!', salesforceAccountId);
        } else {
          // If we didn't find an existing record, or found one onwned by the integrations admin or a disabled user, we'll round robin it between the AE's Salesforce users.
          let roundRobinUsers = await salesforceConnection.sobject('User')
          .find({
            AE_Round_robin__c: true,// eslint-disable-line camelcase
          });
          let userWithEarliestAssignTimeStamp = _.sortBy(roundRobinUsers, 'AE_Account_Assignment_round_robin__c')[0];

          let today = new Date();
          let nowOn = today.toISOString().replace('Z', '+0000');
          // Update the accountOwnerId value to be the ID of the next user in the round robin.
          salesforceAccountOwnerId = userWithEarliestAssignTimeStamp.Id;
          // Update this user to put them at the bottom of the round robin list.
          await salesforceConnection.sobject('User')
          .update({
            Id: salesforceAccountOwnerId,
            // eslint-disable-next-line camelcase
            AE_Account_Assignment_round_robin__c: nowOn
          });


          if(existingAccountRecord){
            // If we found an existing Account record owned by the integrations admin user account, reassign it to the new owner.
            salesforceAccountId = existingAccountRecord.Id;
            await salesforceConnection.sobject('Account')
            .update({
              Id: salesforceAccountId,
              OwnerId: salesforceAccountOwnerId
            });
          } else {
            // If no existing account record was found, create a new one.
            let newAccountRecord = await salesforceConnection.sobject('Account')
            .create({
              OwnerId: salesforceAccountOwnerId,
              Account_Assigned_date__c: nowOn,// eslint-disable-line camelcase
              // eslint-disable-next-line camelcase
              Current_Assignment_Reason__c: 'Inbound Lead',// TODO verify that this matters. if not, do not set it.
              Prospect_Status__c: 'Assigned',// eslint-disable-line camelcase

              Name: enrichmentData.employer.organization,// IFWMIH: We know organization exists
              Website: enrichmentData.employer.emailDomain,
              LinkedIn_company_URL__c: enrichmentData.employer.linkedinCompanyPageUrl,// eslint-disable-line camelcase
              NumberOfEmployees: enrichmentData.employer.numberOfEmployees,
            });
            salesforceAccountId = newAccountRecord.id;
          }//ﬁ
          // console.log('New account created!', salesforceAccountId);
        }//ﬁ
      }//ﬁ

      // Only set leadSource on new contact records.
      if(leadSource) {
        valuesToSet.LeadSource = leadSource;
      }
      // console.log(`creating new Contact record.`)
      // Create a new Contact record for this person.
      let newContactRecord = await salesforceConnection.sobject('Contact')
      .create({
        AccountId: salesforceAccountId,
        OwnerId: salesforceAccountOwnerId,
        FirstName: firstName,
        LastName: lastName,
        ...valuesToSet,
      });
      // console.log(`Created ${newContactRecord.id}`);
      salesforceContactId = newContactRecord.id;
    }//ﬁ

    return {
      salesforceAccountId,
      salesforceContactId
    };

  }


};

