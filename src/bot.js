// Load .env file.
require('dotenv').config({
  path: '../.env'
})

const
  Telegraf = require('telegraf'),
  LocalSession = require('telegraf-session-local'),
  Markup = require('telegraf/markup'),
  property = 'data',
  bot = new Telegraf(process.env.BOT_TOKEN),
  MongoClient = require('mongodb').MongoClient,
  chalk = require('chalk')

// Price for usually accelerators.
const price = {
  1: 10_000,
  2: 30_000
}
// Price for time accelerators.
const priceTime = {
  500: 40_000,
  250: 100_000
}

// Mongo client.
const mongoClient = new MongoClient(
  `mongodb+srv://money-bot:${process.env.BOT_DB_PASSWORD}@cluster0.i9ln5.gcp.mongodb.net/test`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
)

// Check Mongo connect...
mongoClient.connect((err, client) => {
  err && console.log(chalk.red(err))
  client.isConnected() === true && console.log(chalk.green("MongoDB - Connected successfully..."))
})

// User already typed "/s"?
let backgroundAcceleratorRunning = false

// Init local sessions.
const localSession = new LocalSession({
  database: process.env.BOT_SESSION,
  property: 'session',
  storage: LocalSession.storageFileAsync,
  format: {
    serialize: (obj) => JSON.stringify(obj, null, 2),
    deserialize: (str) => JSON.parse(str),
  }
})

// Load local session.
bot.use(localSession.middleware(property))

// Helper.
bot.help((ctx) => {
  return ctx.reply('Money', Markup
    .keyboard([
      ['/my 🏦', '/all 🤑', '/start 💰'],
      ['/shop 🛍️', '/s 🏎️']
    ])
    .oneTime()
    .resize()
    .extra()
  )
})

// Start default buttons.
bot.start((ctx, next) => {
  return ctx.reply('+', Markup
    .keyboard([
      ['Add 💰'], ['/my 🏦'], ['/all 🤑']
    ])
    .oneTime(false)
    .resize()
    .extra()
  )
})

// Listener on + money.
bot.on('text', async (ctx, next) => {
  // If is really + money, but not different message.
  if(ctx.message.text === 'Add 💰') {
    // Set counter.
    ctx[property].counter = ctx[property].counter || 0
    // If has user accelerators.
    let accelerators = ctx[property].accelerator ? ctx[property].accelerator.split(',') : null

    if(accelerators) {
      accelerators.map((a) => {
        switch (a) {
          case "x3":
            ctx[property].counter += 3
            console.log(`User @${ctx.from.username || ctx.from.id} get x3 money. He has ${ctx[property].counter}$`)

            break
          case "x2":
            ctx[property].counter += 2
            console.log(`User @${ctx.from.username || ctx.from.id} get x2 money. He has ${ctx[property].counter}$`)

            break
        }
      })
    } else {
      ctx[property].counter++
      ctx[property].username = ctx.from.username || ctx.from.id

      console.log(`User @${ctx.from.username || ctx.from.id} get money.`)
    }
  }

  return await next()
})

// Background accelerators (+money).
bot.command('/s', async (ctx, next) => {
  // You can't many type "/s" only once.
  if(backgroundAcceleratorRunning === false && (ctx[property].acceleratorTime || ctx[property].accelerator)) {
    backgroundAcceleratorRunning = true

    ctx.reply('You run background farm, to save progress just press "Add 💰".', Markup
      .keyboard([
        ['Add 💰']
      ])
      .oneTime(false)
      .resize()
      .extra()
    )

    console.log(`User @${ctx.from.username || ctx.from.id} run accelerators. He has ${ctx[property].counter.toLocaleString({
        style: 'currency', 
        currency: 'US'
    })}$`)

    ctx.reply("You run accelerator!🏎️")
    ctx.reply("You run accelerator!⏱")

    // Set background counter.
    setInterval(() => {
      ctx[property].counter = ctx[property].counter || 0
      // If we have many accelerators.
      let accelerators = ctx[property].accelerator.split(',')

      if(accelerators) {
        accelerators.map((a) => {
          switch (a) {
            case "x3":
              ctx[property].counter += 3
              break
            case "x2":
              ctx[property].counter += 2
              break
          }
        })
      } else {
        ctx[property].counter++
        ctx[property].username = ctx.from.username || ctx.from.id
      }
    }, Number(ctx[property].acceleratorTime) || 1000) // Custom timeout (bought in store).

    return await next()
  }
})

// Get user money count.
bot.command('/my', (ctx) => {
  console.log(`User @${ctx.from.username || ctx.from.id} request him statistic. He has ${ctx[property].counter.toLocaleString({
    style: 'currency',
    currency: 'US'})
  }$`)
  ctx.replyWithMarkdown(`@${ctx.from.username || ctx.from.id} have \`${ctx[property].counter.toLocaleString({style: 'currency', currency: 'US'})}\`💰`)
})

// Get all users money count.
bot.command('/all', (ctx) => {
  const usersData = ctx[property + 'DB'].get('sessions').value()
  let all = ''

  usersData.map((user) => {
    all += `@${user.data.username} have \`${user.data.counter.toLocaleString({style: 'currency', currency: 'US'})}\`💰\n`
  })

  console.log(`User @${ctx.from.username || ctx.from.id} request statistic all users. He has ${ctx[property].counter.toLocaleString({
    style: 'currency', 
    currency: 'US'
  })}$`)

  ctx.replyWithMarkdown(all)
})

// Shop buttons.
bot.command('/shop', (ctx) => {
  // In order to split the buttons into two lines.
  // Usually accelerator buttons
  let buttons = []
  // Time accelerator buttons
  let buttonsTime= []

  console.log(`User @${ctx.from.username || ctx.from.id} request shop.`)

  for (key in price) {
    // Accelerator speed (x2, x3...).
    let acceleratorSpeed = Number(key) + 1
    // User has accelerators or he is he just buying?
    if(ctx[property].accelerator) {
      // If user has accelerators, we don't show him accelerators which are already has.
      if (ctx[property].accelerator.indexOf('x' + key)) {
        buttons.push('/buy' + key + ' (x' + acceleratorSpeed + ') 🏎️')
      }
    } else {
      buttons.push('/buy' + key + ' (x' + acceleratorSpeed + ') 🏎️')
    }
  }

  // Same as with usually accelerators.
  for (key in priceTime) {
    if(ctx[property].acceleratorTime) {
      if (ctx[property].acceleratorTime.indexOf(key)) {
        buttonsTime.push('/buyt' + key + ' (' + key + 'ms) ⏱️')
      }
    } else {
      buttonsTime.push('/buyt' + key + ' (' + key + 'ms) ⏱️')
    }
  }

  return ctx.reply('+', Markup
    .keyboard([
      buttons,
      buttonsTime
    ])
    .oneTime(false)
    .resize()
    .extra()
  )
})

// If user bought usually accelerator.
bot.hears(/\/buy\d+/, (ctx) => {
  // Message with id accelerator.
  let reg = ctx.message.text
  let acceleratorIdString = reg.match(/\/buy\d+/g)[0]
  // Get id (two regexp because in message we have and accelerator speed besides id).
  let acceleratorId = acceleratorIdString.match(/\d+/g)

  // Calculate new user money count.
  const newPrice = Number(ctx[property].counter) - price[acceleratorId]

  // If enough money.
  if(Number(ctx[property].counter) >= Number(price[acceleratorId])) {
    // Check it's first user accelerator or no?
    ctx[property].accelerator = ctx[property].accelerator ? ctx[property].accelerator + ',x' +  + acceleratorId++ : 'x' + acceleratorId++
    ctx[property].counter = newPrice

    console.log(`User: @${ctx[property].username} - bought accelerator with id${acceleratorId}`)

    ctx.reply('Accelerator bought successfully!✔️')
    ctx.reply('Accelerator bought successfully!✔️')
  } else {
    ctx.reply('Accelerator bought failed(hasn\'t money)!❌️')
  }
})

// If user bought time accelerator(same as buy).
bot.hears(/\/buyt\d+/, (ctx) => {
  let reg = ctx.message.text
  let acceleratorIdString = reg.match(/\/buyt\d+/g)[0]
  let acceleratorId = acceleratorIdString.match(/\d+/g)
  const newPrice = Number(ctx[property].counter) - priceTime[acceleratorId]

  console.log(Number(ctx[property].counter))
  console.log(Number(priceTime[acceleratorId]))

  if(Number(ctx[property].counter) >= Number(priceTime[acceleratorId])) {
    // If user already bought this time accelerator.
    if(!ctx[property].acceleratorTime || !ctx[property].acceleratorTime.indexOf(acceleratorId)) {
      ctx[property].acceleratorTime = ctx[property].acceleratorTime ? ctx[property].acceleratorTime + ',' +  acceleratorId : acceleratorId
      ctx[property].counter = newPrice

      console.log(`User: ${ctx[property].username} - bought time accelerator with id${acceleratorId}`)

      ctx.reply('Time accelerator bought successfully!✔️')
    } else {
      ctx.reply('Time accelerator bought failed(already bought)!❌️')
    }
  } else {
    ctx.reply('Time accelerator bought failed(hasn\'t money)!❌️')
  }
})

// Start bot.
bot.startPolling()

