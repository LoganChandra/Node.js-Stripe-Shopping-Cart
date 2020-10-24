if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load()
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripePublicKey = process.env.STRIPE_PUBLIC_KEY

const { raw } = require('express')
const express = require('express')
const app = express()
const fs = require('fs')
const stripe = require('stripe')(stripeSecretKey)

app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.static('public'))

app.get("/stripe-key", (req, res) => {
  res.send({ publicKey: process.env.STRIPE_PUBLIC_KEY });
});

//renders
app.get('/store', function(req, res) {
  fs.readFile('items.json', function(error, data) {
      if (error) {
          res.status(500).end()
      } else {
          res.render('store.ejs', {
              stripePublicKey: stripePublicKey,
              items: JSON.parse(data)
          })
      }
  })
})
app.get('/login', function(req, res) {
  res.render('login.ejs', {
      // stripePublicKey: stripePublicKey,
      // items: JSON.parse(data)
  })
  console.log(req)
})

app.get('/sell', function(req, res) {
  res.render('sell.ejs', {
      // stripePublicKey: stripePublicKey,
      // items: JSON.parse(data)
  })
  console.log(req)
})


app.post('/signUpCust', function(req, res) {
  let userData = req.body.user
  let token = req.body.token
  console.log(userData, token)

  //Creating Customer
  const customer = stripe.customers.create({
    description: userData.firstName + 'Customer',
    email: userData.email,
    name: userData.firstName + ' ' + userData.lastName,

  });

})



app.post('/signUp', function(req, res) {
  let userData = req.body.user
  let token = req.body.token
  console.log(userData, token)


  //Creating Account
  // const account = stripe.accounts.create({
  //   type: 'standard',
  //   country: 'MY',
  //   email: userData.email,
  //   business_type: 'individual',
  //   individual: {
  //     first_name: userData.firstName,
  //     last_name: userData.lastName,
  //   }
  // }).then(function(response) {
  //     console.log('Account:',response)

      console.log('Token: ', token)
      const customer = stripe.customers.create({
        description: userData.firstName + ' - Customer',
        name: userData.firstName + ' ' + userData.lastName,
        email: userData.email,
        source: token,
      // }, {
      //   stripe_account: response.id,
      }
      ).then(function(custRes){

        console.log('Customer: ')
        console.log(custRes)

        userData['id'] = custRes.id //saving customer id
        // userData['acctId'] = response.id //saving customer id
        console.log(userData)

        let writedata = JSON.stringify(userData);
        fs.writeFileSync('users.json', writedata);

      }).catch(function(error){
          console.log('Customer not created')
      
      })
      console.log('Sign in Successful')

  // }).catch(function() {
  //     console.log('Sign In Fail')
  //     res.status(500).end()
  // })


})

// app.post('/forSale', function(req, res) {

//   let userData = req.body
//   fs.readFile('users.json', function(error, data) {

//     const customer = stripe.customers.create({
//     }, {
//       stripeAccount: data.id,
//     });
//     console.log(customer)
//     const paymentIntent = stripe.paymentIntents.create({
//       amount: userData.price,
//       currency: 'myr',
//       payment_method_types: ['card'],
//       // application_fee_amount: 200,//application fee is necessary
//       customer: data.id,
//       transfer_data: {
//         destination: data.id,
//       },
//     }).then(function(response) {
//           console.log('card created')
//           console.log(response.id)
//           // userData['cardId'] = response.id //saving customer id
//           data['merch'].push(userData)
//           console.log(data)
//           let writedata = JSON.stringify(data);

//           fs.writeFileSync('users.json', writedata);

//           console.log(data)

//       })

//   })
// })

  app.post("/forSale", function(req, res) {
    const { paymentMethodId, paymentIntentId, items, currency } = req.body.oD;
    const info = req.body
    console.log('info: ',info)
    const orderAmount = 1500;
    var loggedIn = JSON.parse(fs.readFileSync('users.json', 'utf8'));
    console.log('CREATING PENALTY ON BEHALF OF: ', paymentMethodId)
    console.log('pm: ', loggedIn)

    try {
      let intent;
      if (!paymentIntentId) {
        console.log('customer:', typeof(loggedIn.id))

        const customer = stripe.customers.retrieve(
          loggedIn.id
        );
        console.log('customer:', customer)
        // Create new PaymentIntent
        intent = stripe.paymentIntents.create({
          amount: orderAmount,
          currency: currency,
          // payment_method: paymentMethodId,
          confirmation_method: "manual",
          capture_method: "manual",
          confirm: true,
          customer: loggedIn.id,
        // }, {
        //   stripe_account: loggedIn.acctId,
        }
        );

        var itemData = JSON.parse(fs.readFileSync('items.json', 'utf8'));
        var itemSold = {
          id: uuidv4(),
          name: req.body.name,
          price: parseInt(req.body.price,10),
          size: parseInt(req.body.size,10),
          bidPrice: parseInt(req.body.bidPrice,10),
          imgName: req.body.imgName,
          seller: loggedIn.id
        }
        
        itemData['merch'].push(itemSold)
        let writedata = JSON.stringify(itemData);
        console.log('write data: ', itemSold)
        fs.writeFileSync('items.json', writedata);

        
        console.log(intent)
      } else {
        // Confirm the PaymentIntent to place a hold on the card
        intent = stripe.paymentIntents.confirm(paymentIntentId);
        // console.log(intent)
                
      }
  
      if (intent.status === "requires_capture") {
        console.log("❗ Charging the card for: " + intent.amount_capturable);
        
        intent = stripe.paymentIntents.capture(intent.id);
      }
      
      
      const response = generateResponse(intent);
      res.send(response);
    } catch (e) {
      // Handle "hard declines" e.g. insufficient funds, expired card, etc
      // See https://stripe.com/docs/declines/codes for more
      res.send({ error: e.message });
    }
  });



app.post('/purchase', function(req, res) {
  fs.readFile('items.json', function(error, data) {
      if (error) {
          res.status(500).end()
      } else {
          const itemsJson = JSON.parse(data)
          const itemsArray = itemsJson.music.concat(itemsJson.merch)
          let total = 0
          console.log(req.nody)
          req.body.items.forEach(async function(item) {
              const itemJson = await itemsArray.find(async function(i) {

                console.log('ok here', i.seller);

                //Paying sellers
                const card = await stripe.customers.listSources(
                  "cus_IFwiUikzalsrgZ",
                  {object: 'card', limit: 1}
                ).then(async function(res){
                  console.log('Cust card: ', res)

                  const payout = await stripe.payouts.create({
                    amount: 500 * 100,
                    currency: 'myr',
                    destination: "cus_IFwiUikzalsrgZ"
                  }).then(function(e){
                    console.log('payout successful', e.message)
                  }).catch(function(e){
                    console.log('create payout unsuccessful', e.message)

                  })
                }).catch(function(e){
                  console.log('list customers unsuccessful', e.message)

                })
                  
                  return i.id == item.id
              })
              total = total + itemJson.price * item.quantity

              
          })

          stripe.charges.create({
              amount: total,
              source: req.body.stripeTokenId,
              currency: 'myr'
          }).then(function() {
              console.log('Charge Successful')
              res.json({
                  message: 'Successfully purchased items'
              })
          }).catch(function() {
              console.log('Charge Fail')
              res.status(500).end()
          })
      }
  })
})

// app.get('/sell', function(req, res){
//   console.log('sell')

// })

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
}

const generateResponse = intent => {
  // Generate a response based on the intent's status
  switch (intent.status) {
    case "requires_action":
    case "requires_source_action":
      // Card requires authentication
      return {
        requiresAction: true,
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret
      };
    case "requires_payment_method":
    case "requires_source":
      // Card was not properly authenticated, suggest a new payment method
      return {
        error: "Your card was denied, please provide a new payment method"
      };
    case "succeeded":
      // Payment is complete, authentication not required
      // To cancel the payment after capture you will need to issue a Refund (https://stripe.com/docs/api/refunds)
      console.log("💰 Payment received!");
      return { clientSecret: intent.client_secret };
  }
};

app.listen(3000)